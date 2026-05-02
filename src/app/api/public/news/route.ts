import { Op, type WhereOptions } from "sequelize";

import { News, NewsCategory, User } from "@/database/models";
import { successResponse } from "@/lib/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const categorySlug = searchParams.get("category") || "";
  const featured = searchParams.get("featured") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {
    status: "PUBLISHED",
  };

  if (featured === "true") {
    whereCondition.isFeatured = true;
  }

  if (search) {
    (whereCondition as any)[Op.or] = [
      {
        title: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        excerpt: {
          [Op.iLike]: `%${search}%`,
        },
      },
    ];
  }

  const categoryWhere =
    categorySlug && categorySlug !== "ALL"
      ? {
          slug: categorySlug,
          isActive: true,
        }
      : {
          isActive: true,
        };

  const { rows, count } = await News.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: NewsCategory,
        as: "category",
        where: categoryWhere,
        attributes: ["id", "name", "slug"],
      },
      {
        model: User,
        as: "author",
        attributes: ["id", "fullName"],
        required: false,
      },
    ],
    order: [
      ["publishedAt", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit,
    offset,
    distinct: true,
  });

  return successResponse({
    message: "Public news fetched successfully",
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}
