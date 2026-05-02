import { News, NewsCategory, User } from "@/database/models";
import { errorResponse, successResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(req: Request, context: RouteContext) {
  const { slug } = await context.params;

  const news = await News.findOne({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: [
      {
        model: NewsCategory,
        as: "category",
        attributes: ["id", "name", "slug"],
        where: {
          isActive: true,
        },
      },
      {
        model: User,
        as: "author",
        attributes: ["id", "fullName"],
        required: false,
      },
    ],
  });

  if (!news) {
    return errorResponse({
      message: "News tidak ditemukan",
      status: 404,
    });
  }

  await news.increment("viewCount");

  return successResponse({
    message: "Public news detail fetched successfully",
    data: news,
  });
}
