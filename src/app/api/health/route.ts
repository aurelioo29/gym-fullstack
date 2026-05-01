import { connectDatabase } from "@/lib/sequelize";
import { successResponse, errorResponse } from "@/lib/response";

export async function GET() {
  const result = await connectDatabase();

  if (!result.connected) {
    return errorResponse({
      message: result.message,
      status: 500,
    });
  }

  return successResponse({
    message: "API is healthy",
    data: {
      database: "connected",
      timestamp: new Date().toISOString(),
    },
  });
}
