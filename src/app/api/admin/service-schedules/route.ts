import { Op, type WhereOptions } from "sequelize";
import { ZodError } from "zod";

import {
  Role,
  Service,
  ServiceSchedule,
  TrainerProfile,
  User,
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
import { createServiceScheduleSchema } from "@/lib/validations/admin.validation";

async function validateServiceAndTrainer(
  serviceId: string,
  trainerId?: string | null,
) {
  const service = await Service.findByPk(serviceId);

  if (!service) {
    return "Service tidak ditemukan";
  }

  if (!service.isActive) {
    return "Service tidak aktif";
  }

  if (!trainerId) {
    return null;
  }

  const trainer = await User.findOne({
    where: {
      id: trainerId,
      isActive: true,
    },
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["id", "name", "slug"],
      },
      {
        model: TrainerProfile,
        as: "trainerProfile",
        required: false,
      },
    ],
  });

  if (!trainer) {
    return "Trainer tidak ditemukan atau tidak aktif";
  }

  if (trainer.role?.slug !== "TRAINER") {
    return "User trainer harus memiliki role TRAINER";
  }

  if (trainer.trainerProfile?.approvalStatus !== "APPROVED") {
    return "Trainer harus approved sebelum bisa dibuatkan schedule";
  }

  return null;
}

export async function GET(req: Request) {
  const admin = await getAdminSession("service_schedules.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const serviceId = searchParams.get("serviceId") || "";
  const trainerId = searchParams.get("trainerId") || "";
  const isCancelled = searchParams.get("isCancelled") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {};

  if (serviceId && serviceId !== "ALL") {
    whereCondition.serviceId = serviceId;
  }

  if (trainerId && trainerId !== "ALL") {
    whereCondition.trainerId = trainerId;
  }

  if (isCancelled === "true") {
    whereCondition.isCancelled = true;
  }

  if (isCancelled === "false") {
    whereCondition.isCancelled = false;
  }

  if (search) {
    (whereCondition as any)[Op.or] = [
      {
        title: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        location: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        notes: {
          [Op.iLike]: `%${search}%`,
        },
      },
    ];
  }

  const { rows, count } = await ServiceSchedule.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: Service,
        as: "service",
        attributes: [
          "id",
          "name",
          "slug",
          "serviceType",
          "price",
          "durationMinutes",
          "capacity",
        ],
      },
      {
        model: User,
        as: "trainer",
        attributes: ["id", "fullName", "email", "phone", "avatarUrl"],
        required: false,
      },
      {
        model: User,
        as: "createdByUser",
        attributes: ["id", "fullName", "email"],
        required: false,
      },
    ],
    order: [["startTime", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return successResponse({
    message: "Service schedules fetched successfully",
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
  const admin = await getAdminSession("service_schedules.create");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const body = await req.json();
    const payload = createServiceScheduleSchema.parse(body);

    const validationMessage = await validateServiceAndTrainer(
      payload.serviceId,
      payload.trainerId,
    );

    if (validationMessage) {
      return errorResponse({
        message: validationMessage,
        status: 400,
      });
    }

    const schedule = await ServiceSchedule.create({
      serviceId: payload.serviceId,
      trainerId: payload.trainerId ?? null,
      title: payload.title ?? null,
      startTime: payload.startTime,
      endTime: payload.endTime,
      capacity: payload.capacity,
      bookedSlots: 0,
      location: payload.location ?? null,
      notes: payload.notes ?? null,
      isCancelled: false,
      cancelReason: null,
      createdBy: admin.session.user.id,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CREATE_SERVICE_SCHEDULE,
      resourceType: ResourceType.SERVICE_SCHEDULE,
      resourceId: schedule.id,
      oldData: null,
      newData: serializeModel(schedule),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Service schedule created successfully",
      data: schedule,
      status: 201,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Create service schedule error:", error);

    return errorResponse({
      message: "Failed to create service schedule",
      status: 500,
    });
  }
}
