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
import { updateServiceScheduleSchema } from "@/lib/validations/admin.validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(req: Request, context: RouteContext) {
  const admin = await getAdminSession("service_schedules.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

  const schedule = await ServiceSchedule.findOne({
    where: {
      id,
    },
    include: [
      {
        model: Service,
        as: "service",
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
  });

  if (!schedule) {
    return errorResponse({
      message: "Service schedule tidak ditemukan",
      status: 404,
    });
  }

  return successResponse({
    message: "Service schedule fetched successfully",
    data: schedule,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("service_schedules.update");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const payload = updateServiceScheduleSchema.parse(body);

    const schedule = await ServiceSchedule.findByPk(id);

    if (!schedule) {
      return errorResponse({
        message: "Service schedule tidak ditemukan",
        status: 404,
      });
    }

    const nextServiceId = payload.serviceId ?? schedule.serviceId;
    const nextTrainerId =
      payload.trainerId !== undefined ? payload.trainerId : schedule.trainerId;

    const validationMessage = await validateServiceAndTrainer(
      nextServiceId,
      nextTrainerId,
    );

    if (validationMessage) {
      return errorResponse({
        message: validationMessage,
        status: 400,
      });
    }

    const nextStartTime = payload.startTime ?? schedule.startTime;
    const nextEndTime = payload.endTime ?? schedule.endTime;

    if (nextEndTime <= nextStartTime) {
      return errorResponse({
        message: "End time harus setelah start time",
        status: 400,
      });
    }

    const nextCapacity =
      payload.capacity !== undefined ? payload.capacity : schedule.capacity;

    if (nextCapacity < schedule.bookedSlots) {
      return errorResponse({
        message: "Capacity tidak boleh lebih kecil dari booked slots",
        status: 400,
      });
    }

    const oldData = serializeModel(schedule);

    await schedule.update({
      serviceId: nextServiceId,
      trainerId: nextTrainerId,
      title: payload.title !== undefined ? payload.title : schedule.title,
      startTime: nextStartTime,
      endTime: nextEndTime,
      capacity: nextCapacity,
      location:
        payload.location !== undefined ? payload.location : schedule.location,
      notes: payload.notes !== undefined ? payload.notes : schedule.notes,
      isCancelled:
        payload.isCancelled !== undefined
          ? payload.isCancelled
          : schedule.isCancelled,
      cancelReason:
        payload.cancelReason !== undefined
          ? payload.cancelReason
          : schedule.cancelReason,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.UPDATE_SERVICE_SCHEDULE,
      resourceType: ResourceType.SERVICE_SCHEDULE,
      resourceId: schedule.id,
      oldData,
      newData: serializeModel(schedule),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Service schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Update service schedule error:", error);

    return errorResponse({
      message: "Failed to update service schedule",
      status: 500,
    });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const admin = await getAdminSession("service_schedules.delete");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

  const schedule = await ServiceSchedule.findByPk(id);

  if (!schedule) {
    return errorResponse({
      message: "Service schedule tidak ditemukan",
      status: 404,
    });
  }

  if (schedule.bookedSlots > 0) {
    return errorResponse({
      message: "Schedule yang sudah memiliki booking tidak boleh dihapus",
      status: 400,
    });
  }

  const oldData = serializeModel(schedule);

  await schedule.destroy();

  await createAuditLog({
    userId: admin.session.user.id,
    action: AuditAction.DELETE_SERVICE_SCHEDULE,
    resourceType: ResourceType.SERVICE_SCHEDULE,
    resourceId: id,
    oldData,
    newData: null,
    ipAddress: getClientIp(req),
  });

  return successResponse({
    message: "Service schedule deleted successfully",
    data: null,
  });
}
