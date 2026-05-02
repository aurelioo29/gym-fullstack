import bcrypt from "bcryptjs";
import { Role, User, Permission } from "@/database/models";
import { ActivityType } from "@/constants/logs";
import { createActivityLog } from "@/lib/logs";

type AdminLoginInput = {
  identifier: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const ADMIN_ALLOWED_ROLES = ["SUPERADMIN", "ADMIN"];

async function logAdminLoginActivity({
  userId = null,
  identifier,
  activity,
  description,
  reason,
  role,
  ipAddress = null,
  userAgent = null,
}: {
  userId?: string | null;
  identifier?: string | null;
  activity: string;
  description: string;
  reason?: string;
  role?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await createActivityLog({
    userId,
    activity,
    description,
    metadata: {
      identifier,
      channel: "WEB_ADMIN",
      reason,
      role,
    },
    ipAddress,
    userAgent,
  });
}

export async function authorizeAdminLogin({
  identifier,
  password,
  ipAddress = null,
  userAgent = null,
}: AdminLoginInput) {
  const cleanIdentifier = identifier?.trim();

  if (!cleanIdentifier || !password) {
    await logAdminLoginActivity({
      identifier: cleanIdentifier || null,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: missing identifier or password",
      reason: "MISSING_CREDENTIALS",
      ipAddress,
      userAgent,
    });

    return null;
  }

  const isEmail = cleanIdentifier.includes("@");

  const user = await User.findOne({
    where: isEmail
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier },
    include: [
      {
        model: Role,
        as: "role",
        include: [
          {
            model: Permission,
            as: "permissions",
            through: {
              attributes: [],
            },
          },
        ],
      },
    ],
  });

  if (!user) {
    await logAdminLoginActivity({
      identifier: cleanIdentifier,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: user not found",
      reason: "USER_NOT_FOUND",
      ipAddress,
      userAgent,
    });

    return null;
  }

  const role = user.get("role") as Role & {
    permissions?: Permission[];
  };

  if (!user.isActive) {
    await logAdminLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: inactive account",
      reason: "INACTIVE_ACCOUNT",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Akun belum aktif atau sedang dinonaktifkan.");
  }

  if (!user.emailVerifiedAt) {
    await logAdminLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: email not verified",
      reason: "EMAIL_NOT_VERIFIED",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Email belum diverifikasi.");
  }

  if (!role || !ADMIN_ALLOWED_ROLES.includes(role.slug)) {
    await logAdminLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: role not allowed",
      reason: "ROLE_NOT_ALLOWED",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Akun ini tidak memiliki akses ke dashboard admin.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    await logAdminLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.ADMIN_LOGIN_FAILED,
      description: "Admin login failed: invalid password",
      reason: "INVALID_PASSWORD",
      role: role.slug,
      ipAddress,
      userAgent,
    });

    return null;
  }

  await user.update({
    lastLoginAt: new Date(),
  });

  await logAdminLoginActivity({
    userId: user.id,
    identifier: cleanIdentifier,
    activity: ActivityType.ADMIN_LOGIN_SUCCESS,
    description: "Admin logged in successfully",
    reason: "LOGIN_SUCCESS",
    role: role.slug,
    ipAddress,
    userAgent,
  });

  const permissions =
    role.permissions?.map((permission) => permission.key) ?? [];

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    image: user.avatarUrl,
    roleId: user.roleId,
    role: role.slug,
    permissions,
  };
}
