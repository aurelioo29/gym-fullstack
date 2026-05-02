import { NewsCategory } from "@/database/models";
import { successResponse } from "@/lib/response";

export async function GET() {
  const categories = await NewsCategory.findAll({
    where: {
      isActive: true,
    },
    order: [["name", "ASC"]],
  });

  return successResponse({
    message: "Public news categories fetched successfully",
    data: categories,
  });
}
