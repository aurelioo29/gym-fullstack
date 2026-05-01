import { TrainerProfile, User } from "@/database/models";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { errorResponse, successResponse } from "@/lib/response";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getClientIp } from "@/lib/request";
import { createNotification } from "@/lib/notifications";
import { NotificationType } from "@/constants/logs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("trainer_profiles.approve");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

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

  if (!trainerProfile.certificateUrl) {
    return errorResponse({
      message: "Trainer belum upload sertifikat",
      status: 400,
    });
  }

  if (trainerProfile.approvalStatus === "APPROVED") {
    return successResponse({
      message: "Trainer sudah approved",
      data: {
        trainerProfile,
      },
    });
  }

  const oldData = serializeModel(trainerProfile);

  await trainerProfile.update({
    approvalStatus: "APPROVED",
    approvedBy: admin.session.user.id,
    approvedAt: new Date(),
    rejectedReason: null,
    isAvailable: true,
  });

  const newData = serializeModel(trainerProfile);

  await createAuditLog({
    userId: admin.session.user.id,
    action: AuditAction.APPROVE_TRAINER,
    resourceType: ResourceType.TRAINER_PROFILE,
    resourceId: trainerProfile.id,
    oldData,
    newData,
    ipAddress: getClientIp(req),
  });

  await createNotification({
    recipientUserId: trainerProfile.userId,
    actorUserId: admin.session.user.id,
    type: NotificationType.TRAINER_APPROVED,
    title: "Trainer account approved",
    message: "Sertifikat kamu sudah disetujui. Kamu sekarang bisa mengajar.",
    data: {
      trainerProfileId: trainerProfile.id,
      approvalStatus: trainerProfile.approvalStatus,
    },
  });

  return successResponse({
    message: "Trainer approved successfully",
    data: {
      trainerProfile: {
        id: trainerProfile.id,
        userId: trainerProfile.userId,
        certificateUrl: trainerProfile.certificateUrl,
        approvalStatus: "APPROVED",
        approvedBy: admin.session.user.id,
        approvedAt: trainerProfile.approvedAt,
        isAvailable: true,
        canTeach: true,
      },
    },
  });
}
