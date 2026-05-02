import { Op, type WhereOptions } from "sequelize";
import { ZodError } from "zod";

import {
  Booking,
  Role,
  Service,
  ServiceSchedule,
  User,
  sequelize,
} from "@/database/models";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { getClientIp } from "@/lib/request";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/response";
import { createBookingSchema } from "@/lib/validations/admin.validation";

export async function GET(req: Request) {
  const admin = await getAdminSession("bookings.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const serviceScheduleId = searchParams.get("serviceScheduleId") || "";
  const userId = searchParams.get("userId") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {};

  if (status && status !== "ALL") {
    whereCondition.status = status;
  }

  if (serviceScheduleId && serviceScheduleId !== "ALL") {
    whereCondition.serviceScheduleId = serviceScheduleId;
  }

  if (userId && userId !== "ALL") {
    whereCondition.userId = userId;
  }

  const userInclude: any = {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "email", "phone", "avatarUrl"],
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["id", "name", "slug"],
      },
    ],
  };

  if (search) {
    userInclude.where = {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ],
    };
  }

  const { rows, count } = await Booking.findAndCountAll({
    where: whereCondition,
    include: [
      userInclude,
      {
        model: ServiceSchedule,
        as: "serviceSchedule",
        include: [
          {
            model: Service,
            as: "service",
            attributes: ["id", "name", "slug", "serviceType", "price"],
          },
          {
            model: User,
            as: "trainer",
            attributes: ["id", "fullName", "email"],
            required: false,
          },
        ],
      },
      {
        model: User,
        as: "createdByUser",
        attributes: ["id", "fullName", "email"],
        required: false,
      },
      {
        model: User,
        as: "cancelledByUser",
        attributes: ["id", "fullName", "email"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return successResponse({
    message: "Bookings fetched successfully",
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}

export async function POST(req: Request) {
  const admin = await getAdminSession("bookings.create");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const body = await req.json();
    const payload = createBookingSchema.parse(body);

    const user = await User.findOne({
      where: {
        id: payload.userId,
        isActive: true,
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name", "slug"],
        },
      ],
      transaction,
    });

    if (!user) {
      await transaction.rollback();

      return errorResponse({
        message: "Customer tidak ditemukan atau tidak aktif",
        status: 404,
      });
    }

    if (user.role?.slug !== "CUSTOMER") {
      await transaction.rollback();

      return errorResponse({
        message: "Booking hanya bisa dibuat untuk user CUSTOMER",
        status: 400,
      });
    }

    const schedule = await ServiceSchedule.findByPk(payload.serviceScheduleId, {
      include: [
        {
          model: Service,
          as: "service",
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!schedule) {
      await transaction.rollback();

      return errorResponse({
        message: "Service schedule tidak ditemukan",
        status: 404,
      });
    }

    if (schedule.isCancelled) {
      await transaction.rollback();

      return errorResponse({
        message: "Schedule sudah dibatalkan",
        status: 400,
      });
    }

    if (schedule.endTime <= new Date()) {
      await transaction.rollback();

      return errorResponse({
        message: "Schedule sudah lewat",
        status: 400,
      });
    }

    if (schedule.capacity > 0 && schedule.bookedSlots >= schedule.capacity) {
      await transaction.rollback();

      return errorResponse({
        message: "Slot schedule sudah penuh",
        status: 400,
      });
    }

    const existingBooking = await Booking.findOne({
      where: {
        userId: payload.userId,
        serviceScheduleId: payload.serviceScheduleId,
        status: {
          [Op.ne]: "CANCELLED",
        },
      },
      transaction,
    });

    if (existingBooking) {
      await transaction.rollback();

      return errorResponse({
        message: "Customer sudah memiliki booking untuk schedule ini",
        status: 400,
      });
    }

    const booking = await Booking.create(
      {
        userId: payload.userId,
        serviceScheduleId: payload.serviceScheduleId,
        status: "BOOKED",
        amountPaid: String(payload.amountPaid ?? 0),
        paymentReference: payload.paymentReference ?? null,
        notes: payload.notes ?? null,
        bookedAt: new Date(),
        cancelledBy: null,
        cancelReason: null,
        cancelledAt: null,
        createdBy: admin.session.user.id,
      },
      { transaction },
    );

    await schedule.increment("bookedSlots", {
      by: 1,
      transaction,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CREATE_BOOKING,
      resourceType: ResourceType.BOOKING,
      resourceId: booking.id,
      oldData: null,
      newData: serializeModel(booking),
      ipAddress: getClientIp(req),
      transaction,
    });

    await transaction.commit();

    return successResponse({
      message: "Booking created successfully",
      data: booking,
      status: 201,
    });
  } catch (error) {
    await transaction.rollback();

    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Create booking error:", error);

    return errorResponse({
      message: "Failed to create booking",
      status: 500,
    });
  }
}
