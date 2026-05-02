import { Service } from "@/database/models";
import { successResponse } from "@/lib/response";

export async function GET() {
  const services = await Service.findAll({
    where: {
      isActive: true,
    },
    order: [["name", "ASC"]],
  });

  return successResponse({
    message: "Public services fetched successfully",
    data: services,
  });
}
