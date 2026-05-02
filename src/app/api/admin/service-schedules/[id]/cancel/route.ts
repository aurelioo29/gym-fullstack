import { ZodError } from "zod";

import { ServiceSchedule } from "@/database/models";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { getClientIp } from "@/lib/request";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/response";
import { cancelServiceScheduleSchema } from "@/lib/validations/admin.validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("service_schedules.cancel");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const payload = cancelServiceScheduleSchema.parse(body);

    const schedule = await ServiceSchedule.findByPk(id);

    if (!schedule) {
      return errorResponse({
        message: "Service schedule tidak ditemukan",
        status: 404,
      });
    }

    if (schedule.isCancelled) {
      return errorResponse({
        message: "Schedule sudah dibatalkan",
        status: 400,
      });
    }

    const oldData = serializeModel(schedule);

    await schedule.update({
      isCancelled: true,
      cancelReason: payload.cancelReason,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CANCEL_SERVICE_SCHEDULE,
      resourceType: ResourceType.SERVICE_SCHEDULE,
      resourceId: schedule.id,
      oldData,
      newData: serializeModel(schedule),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Service schedule cancelled successfully",
      data: schedule,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Cancel service schedule error:", error);

    return errorResponse({
      message: "Failed to cancel service schedule",
      status: 500,
    });
  }
}
