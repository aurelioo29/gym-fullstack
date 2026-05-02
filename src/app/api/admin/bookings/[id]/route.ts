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
import { updateBookingSchema } from "@/lib/validations/admin.validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: RouteContext) {
  const admin = await getAdminSession("bookings.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

  const booking = await Booking.findOne({
    where: { id },
    include: [
      {
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
      },
      {
        model: ServiceSchedule,
        as: "serviceSchedule",
        include: [
          {
            model: Service,
            as: "service",
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
  });

  if (!booking) {
    return errorResponse({
      message: "Booking tidak ditemukan",
      status: 404,
    });
  }

  return successResponse({
    message: "Booking fetched successfully",
    data: booking,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("bookings.update");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = await context.params;
    const body = await req.json();
    const payload = updateBookingSchema.parse(body);

    const booking = await Booking.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();

      return errorResponse({
        message: "Booking tidak ditemukan",
        status: 404,
      });
    }

    if (booking.status === "CANCELLED") {
      await transaction.rollback();

      return errorResponse({
        message: "Booking yang sudah cancelled tidak bisa diupdate",
        status: 400,
      });
    }

    if (payload.status === "CANCELLED") {
      await transaction.rollback();

      return errorResponse({
        message: "Gunakan endpoint cancel untuk membatalkan booking",
        status: 400,
      });
    }

    const oldData = serializeModel(booking);

    await booking.update(
      {
        status: payload.status ?? booking.status,
        amountPaid:
          payload.amountPaid !== undefined
            ? String(payload.amountPaid)
            : booking.amountPaid,
        paymentReference:
          payload.paymentReference !== undefined
            ? payload.paymentReference
            : booking.paymentReference,
        notes: payload.notes !== undefined ? payload.notes : booking.notes,
      },
      { transaction },
    );

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.UPDATE_BOOKING,
      resourceType: ResourceType.BOOKING,
      resourceId: booking.id,
      oldData,
      newData: serializeModel(booking),
      ipAddress: getClientIp(req),
      transaction,
    });

    await transaction.commit();

    return successResponse({
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    await transaction.rollback();

    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Update booking error:", error);

    return errorResponse({
      message: "Failed to update booking",
      status: 500,
    });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const admin = await getAdminSession("bookings.delete");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = await context.params;

    const booking = await Booking.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();

      return errorResponse({
        message: "Booking tidak ditemukan",
        status: 404,
      });
    }

    if (booking.status === "BOOKED") {
      const schedule = await ServiceSchedule.findByPk(
        booking.serviceScheduleId,
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        },
      );

      if (schedule && schedule.bookedSlots > 0) {
        await schedule.decrement("bookedSlots", {
          by: 1,
          transaction,
        });
      }
    }

    const oldData = serializeModel(booking);

    await booking.destroy({ transaction });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.DELETE_BOOKING,
      resourceType: ResourceType.BOOKING,
      resourceId: id,
      oldData,
      newData: null,
      ipAddress: getClientIp(req),
      transaction,
    });

    await transaction.commit();

    return successResponse({
      message: "Booking deleted successfully",
      data: null,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Delete booking error:", error);

    return errorResponse({
      message: "Failed to delete booking",
      status: 500,
    });
  }
}
