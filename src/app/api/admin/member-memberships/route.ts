import { Op, type WhereOptions } from "sequelize";
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
import { createMemberMembershipSchema } from "@/lib/validations/admin.validation";

function calculateEndDate(startDate: Date, durationDays: number) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
}

export async function GET(req: Request) {
  const admin = await getAdminSession("member_memberships.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const paymentStatus = searchParams.get("paymentStatus") || "";
  const paymentMethod = searchParams.get("paymentMethod") || "";
  const membershipPlanId = searchParams.get("membershipPlanId") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {};

  if (status && status !== "ALL") {
    whereCondition.status = status;
  }

  if (paymentStatus && paymentStatus !== "ALL") {
    whereCondition.paymentStatus = paymentStatus;
  }

  if (paymentMethod && paymentMethod !== "ALL") {
    whereCondition.paymentMethod = paymentMethod;
  }

  if (membershipPlanId && membershipPlanId !== "ALL") {
    whereCondition.membershipPlanId = membershipPlanId;
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
        {
          fullName: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          email: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          phone: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ],
    };
  }

  const { rows, count } = await MemberMembership.findAndCountAll({
    where: whereCondition,
    include: [
      userInclude,
      {
        model: MembershipPlan,
        as: "membershipPlan",
        attributes: ["id", "name", "slug", "price", "durationDays"],
      },
      {
        model: User,
        as: "createdByUser",
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
    message: "Member memberships fetched successfully",
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
  const admin = await getAdminSession("member_memberships.create");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const body = await req.json();
    const payload = createMemberMembershipSchema.parse(body);

    const user = await User.findOne({
      where: {
        id: payload.userId,
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    if (!user) {
      return errorResponse({
        message: "User tidak ditemukan",
        status: 404,
      });
    }

    if (user.role?.slug !== "CUSTOMER") {
      return errorResponse({
        message: "Membership hanya bisa dibuat untuk user CUSTOMER",
        status: 400,
      });
    }

    const plan = await MembershipPlan.findByPk(payload.membershipPlanId);

    if (!plan) {
      return errorResponse({
        message: "Membership plan tidak ditemukan",
        status: 404,
      });
    }

    if (!plan.isActive) {
      return errorResponse({
        message: "Membership plan tidak aktif",
        status: 400,
      });
    }

    const startDate = payload.startDate;
    const endDate = calculateEndDate(startDate, plan.durationDays);

    const membership = await MemberMembership.create({
      userId: payload.userId,
      membershipPlanId: payload.membershipPlanId,
      startDate,
      endDate,
      status: payload.status ?? "ACTIVE",
      paymentStatus: payload.paymentStatus ?? "PAID",
      paymentMethod: payload.paymentMethod ?? "OFFLINE_CASH",
      paidAmount: String(payload.paidAmount),
      paymentReference: payload.paymentReference ?? null,
      notes: payload.notes ?? null,
      createdBy: admin.session.user.id,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CREATE_MEMBER_MEMBERSHIP,
      resourceType: ResourceType.MEMBER_MEMBERSHIP,
      resourceId: membership.id,
      oldData: null,
      newData: serializeModel(membership),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Member membership created successfully",
      data: membership,
      status: 201,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Create member membership error:", error);

    return errorResponse({
      message: "Failed to create member membership",
      status: 500,
    });
  }
}
