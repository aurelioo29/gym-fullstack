import { Op } from "sequelize";

import {
  ActivityLog,
  AuditLog,
  Notification,
  Role,
  TrainerProfile,
  User,
} from "@/database/models";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { errorResponse, successResponse } from "@/lib/response";

function getLast7Days() {
  const days: {
    key: string;
    label: string;
    start: Date;
    end: Date;
  }[] = [];

  for (let index = 6; index >= 0; index -= 1) {
    const start = new Date();
    start.setDate(start.getDate() - index);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    days.push({
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      start,
      end,
    });
  }

  return days;
}

export async function GET() {
  const admin = await getAdminSession("dashboard.view");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const last7Days = getLast7Days();

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalRoles,
    totalActivityLogs,
    totalAuditLogs,
    unreadNotifications,
    pendingTrainerApprovals,
    userRoles,
    activityChart,
    auditChart,
  ] = await Promise.all([
    User.count(),

    User.count({
      where: {
        isActive: true,
      },
    }),

    User.count({
      where: {
        isActive: false,
      },
    }),

    Role.count(),

    ActivityLog.count(),

    AuditLog.count(),

    Notification.count({
      where: {
        recipientUserId: admin.session.user.id,
        isRead: false,
      },
    }),

    TrainerProfile.count({
      where: {
        approvalStatus: "SUBMITTED",
      },
    }),

    Promise.all(
      ["SUPERADMIN", "ADMIN", "CUSTOMER", "TRAINER"].map(async (roleSlug) => {
        const count = await User.count({
          include: [
            {
              model: Role,
              as: "role",
              where: {
                slug: roleSlug,
              },
              attributes: [],
            },
          ],
        });

        return {
          role: roleSlug,
          count,
        };
      }),
    ),

    Promise.all(
      last7Days.map(async (day) => {
        const count = await ActivityLog.count({
          where: {
            createdAt: {
              [Op.between]: [day.start, day.end],
            },
          },
        });

        return {
          day: day.label,
          date: day.key,
          activityLogs: count,
        };
      }),
    ),

    Promise.all(
      last7Days.map(async (day) => {
        const count = await AuditLog.count({
          where: {
            createdAt: {
              [Op.between]: [day.start, day.end],
            },
          },
        });

        return {
          day: day.label,
          date: day.key,
          auditLogs: count,
        };
      }),
    ),
  ]);

  const logsChart = last7Days.map((day, index) => ({
    day: day.label,
    date: day.key,
    activityLogs: activityChart[index].activityLogs,
    auditLogs: auditChart[index].auditLogs,
  }));

  return successResponse({
    message: "Dashboard overview fetched successfully",
    data: {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalRoles,
        totalActivityLogs,
        totalAuditLogs,
        unreadNotifications,
        pendingTrainerApprovals,
      },
      charts: {
        userRoles,
        logsChart,
      },
    },
  });
}
