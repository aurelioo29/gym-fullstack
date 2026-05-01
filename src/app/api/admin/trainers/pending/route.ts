import { Op } from "sequelize";
import { TrainerProfile, User } from "@/database/models";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { errorResponse, successResponse } from "@/lib/response";

export async function GET(req: Request) {
  const admin = await getAdminSession("trainer_profiles.review");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "SUBMITTED";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    whereCondition.approvalStatus = status;
  }

  const userWhere = search
    ? {
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
      }
    : undefined;

  const { rows, count } = await TrainerProfile.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: User,
        as: "user",
        where: userWhere,
        attributes: [
          "id",
          "fullName",
          "email",
          "phone",
          "avatarUrl",
          "isActive",
          "emailVerifiedAt",
          "createdAt",
        ],
      },
      {
        model: User,
        as: "approvedByUser",
        attributes: ["id", "fullName", "email"],
        required: false,
      },
    ],
    order: [["updatedAt", "DESC"]],
    limit,
    offset,
  });

  return successResponse({
    message: "Pending trainers fetched successfully",
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}
