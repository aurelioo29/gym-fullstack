import { connectDatabase } from "@/lib/sequelize";
import { successResponse, errorResponse } from "@/lib/response";
import { Role, User } from "@/database/models";

export async function GET() {
  const result = await connectDatabase();

  if (!result.connected) {
    return errorResponse({
      message: result.message,
      status: 500,
    });
  }

  const roleCount = await Role.count();
  const userCount = await User.count();

  return successResponse({
    message: "API is healthy",
    data: {
      database: "connected",
      models: "loaded",
      counts: {
        roles: roleCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    },
  });
}
