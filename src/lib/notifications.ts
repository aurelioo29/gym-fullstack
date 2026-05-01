import { Op } from "sequelize";
import { Notification, Role, User } from "@/database/models";

type CreateNotificationParams = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: string;
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
};

type CreateNotificationForRolesParams = {
  roleSlugs: string[];
  actorUserId?: string | null;
  type: string;
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
};

export async function createNotification({
  recipientUserId,
  actorUserId = null,
  type,
  title,
  message = null,
  data = null,
}: CreateNotificationParams) {
  try {
    return await Notification.create({
      recipientUserId,
      actorUserId,
      type,
      title,
      message,
      data,
      isRead: false,
      readAt: null,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function createNotificationsForRoles({
  roleSlugs,
  actorUserId = null,
  type,
  title,
  message = null,
  data = null,
}: CreateNotificationForRolesParams) {
  try {
    const users = await User.findAll({
      where: {
        isActive: true,
      },
      include: [
        {
          model: Role,
          as: "role",
          where: {
            slug: {
              [Op.in]: roleSlugs,
            },
          },
          attributes: ["id", "slug"],
        },
      ],
      attributes: ["id"],
    });

    if (users.length === 0) {
      return [];
    }

    return await Notification.bulkCreate(
      users.map((user) => ({
        recipientUserId: user.id,
        actorUserId,
        type,
        title,
        message,
        data,
        isRead: false,
        readAt: null,
      })),
    );
  } catch (error) {
    console.error("Failed to create notifications for roles:", error);
    return [];
  }
}
