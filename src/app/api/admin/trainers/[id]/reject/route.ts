import { z, ZodError } from "zod";
import { TrainerProfile, User } from "@/database/models";
import { getAdminSession } from "@/lib/auth/admin-guard";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/response";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getClientIp } from "@/lib/request";
import { createNotification } from "@/lib/notifications";
import { NotificationType } from "@/constants/logs";

const rejectTrainerSchema = z.object({
  rejectedReason: z
    .string()
    .min(3, "Rejected reason minimal 3 karakter")
    .max(1000, "Rejected reason maksimal 1000 karakter"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("trainer_profiles.reject");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const payload = rejectTrainerSchema.parse(body);

    const trainerProfile = await TrainerProfile.findOne({
      where: {
        id,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
      ],
    });

    if (!trainerProfile) {
      return errorResponse({
        message: "Trainer profile tidak ditemukan",
        status: 404,
      });
    }

    const oldData = serializeModel(trainerProfile);

    await trainerProfile.update({
      approvalStatus: "REJECTED",
      approvedBy: null,
      approvedAt: null,
      rejectedReason: payload.rejectedReason,
      isAvailable: false,
    });

    const newData = serializeModel(trainerProfile);

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.REJECT_TRAINER,
      resourceType: ResourceType.TRAINER_PROFILE,
      resourceId: trainerProfile.id,
      oldData,
      newData,
      ipAddress: getClientIp(req),
    });

    await createNotification({
      recipientUserId: trainerProfile.userId,
      actorUserId: admin.session.user.id,
      type: NotificationType.TRAINER_REJECTED,
      title: "Trainer certificate rejected",
      message: payload.rejectedReason,
      data: {
        trainerProfileId: trainerProfile.id,
        approvalStatus: trainerProfile.approvalStatus,
        rejectedReason: payload.rejectedReason,
      },
    });

    return successResponse({
      message: "Trainer rejected successfully",
      data: {
        trainerProfile: {
          id: trainerProfile.id,
          userId: trainerProfile.userId,
          certificateUrl: trainerProfile.certificateUrl,
          approvalStatus: "REJECTED",
          rejectedReason: payload.rejectedReason,
          isAvailable: false,
          canTeach: false,
        },
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Reject trainer error:", error);

    return errorResponse({
      message: "Failed to reject trainer",
      status: 500,
    });
  }
}
