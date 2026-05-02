import { Op, type WhereOptions } from "sequelize";

import { Service, ServiceSchedule, User } from "@/database/models";
import { successResponse } from "@/lib/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const serviceId = searchParams.get("serviceId") || "";
  const trainerId = searchParams.get("trainerId") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {
    isCancelled: false,
    startTime: {
      [Op.gte]: new Date(),
    },
  };

  if (serviceId && serviceId !== "ALL") {
    whereCondition.serviceId = serviceId;
  }

  if (trainerId && trainerId !== "ALL") {
    whereCondition.trainerId = trainerId;
  }

  const { rows, count } = await ServiceSchedule.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: Service,
        as: "service",
        where: {
          isActive: true,
        },
      },
      {
        model: User,
        as: "trainer",
        attributes: ["id", "fullName", "email", "phone", "avatarUrl"],
        required: false,
      },
    ],
    order: [["startTime", "ASC"]],
    limit,
    offset,
    distinct: true,
  });

  return successResponse({
    message: "Public service schedules fetched successfully",
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}
