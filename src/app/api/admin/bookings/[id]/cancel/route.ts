import { ZodError } from "zod";

import { Booking, ServiceSchedule, sequelize } from "@/database/models";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { getClientIp } from "@/lib/request";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/response";
import { cancelBookingSchema } from "@/lib/validations/admin.validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("bookings.cancel");

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
    const payload = cancelBookingSchema.parse(body);

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
        message: "Booking sudah cancelled",
        status: 400,
      });
    }

    const oldData = serializeModel(booking);

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

    await booking.update(
      {
        status: "CANCELLED",
        cancelledBy: admin.session.user.id,
        cancelReason: payload.cancelReason,
        cancelledAt: new Date(),
      },
      { transaction },
    );

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CANCEL_BOOKING,
      resourceType: ResourceType.BOOKING,
      resourceId: booking.id,
      oldData,
      newData: serializeModel(booking),
      ipAddress: getClientIp(req),
      transaction,
    });

    await transaction.commit();

    return successResponse({
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    await transaction.rollback();

    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Cancel booking error:", error);

    return errorResponse({
      message: "Failed to cancel booking",
      status: 500,
    });
  }
}
