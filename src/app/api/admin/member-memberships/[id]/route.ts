import { ZodError } from "zod";

import {
  MemberMembership,
  MembershipPlan,
  Role,
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
import { updateMemberMembershipSchema } from "@/lib/validations/admin.validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: RouteContext) {
  const admin = await getAdminSession("member_memberships.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

  const membership = await MemberMembership.findOne({
    where: {
      id,
    },
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
        model: MembershipPlan,
        as: "membershipPlan",
      },
      {
        model: User,
        as: "createdByUser",
        attributes: ["id", "fullName", "email"],
        required: false,
      },
    ],
  });

  if (!membership) {
    return errorResponse({
      message: "Member membership tidak ditemukan",
      status: 404,
    });
  }

  return successResponse({
    message: "Member membership fetched successfully",
    data: membership,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await getAdminSession("member_memberships.update");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const payload = updateMemberMembershipSchema.parse(body);

    const membership = await MemberMembership.findByPk(id);

    if (!membership) {
      return errorResponse({
        message: "Member membership tidak ditemukan",
        status: 404,
      });
    }

    const nextStartDate = payload.startDate ?? membership.startDate;
    const nextEndDate = payload.endDate ?? membership.endDate;

    if (nextEndDate < nextStartDate) {
      return errorResponse({
        message: "End date tidak boleh sebelum start date",
        status: 400,
      });
    }

    const oldData = serializeModel(membership);

    await membership.update({
      startDate: nextStartDate,
      endDate: nextEndDate,
      status: payload.status ?? membership.status,
      paymentStatus: payload.paymentStatus ?? membership.paymentStatus,
      paymentMethod: payload.paymentMethod ?? membership.paymentMethod,
      paidAmount:
        payload.paidAmount !== undefined
          ? String(payload.paidAmount)
          : membership.paidAmount,
      paymentReference:
        payload.paymentReference !== undefined
          ? payload.paymentReference
          : membership.paymentReference,
      notes: payload.notes !== undefined ? payload.notes : membership.notes,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.UPDATE_MEMBER_MEMBERSHIP,
      resourceType: ResourceType.MEMBER_MEMBERSHIP,
      resourceId: membership.id,
      oldData,
      newData: serializeModel(membership),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Member membership updated successfully",
      data: membership,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Update member membership error:", error);

    return errorResponse({
      message: "Failed to update member membership",
      status: 500,
    });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const admin = await getAdminSession("member_memberships.delete");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { id } = await context.params;

  const membership = await MemberMembership.findByPk(id);

  if (!membership) {
    return errorResponse({
      message: "Member membership tidak ditemukan",
      status: 404,
    });
  }

  const oldData = serializeModel(membership);

  await membership.destroy();

  await createAuditLog({
    userId: admin.session.user.id,
    action: AuditAction.DELETE_MEMBER_MEMBERSHIP,
    resourceType: ResourceType.MEMBER_MEMBERSHIP,
    resourceId: id,
    oldData,
    newData: null,
    ipAddress: getClientIp(req),
  });

  return successResponse({
    message: "Member membership deleted successfully",
    data: null,
  });
}
