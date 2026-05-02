import bcrypt from "bcryptjs";
import { Role, User } from "@/database/models";
import { ActivityType } from "@/constants/logs";
import { createActivityLog } from "@/lib/logs";

const MOBILE_ALLOWED_ROLES = ["CUSTOMER", "TRAINER"];

type MobileLoginInput = {
  identifier: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function logMobileLoginActivity({
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
      channel: "MOBILE",
      reason,
      role,
    },
    ipAddress,
    userAgent,
  });
}

export async function authorizeMobileLogin({
  identifier,
  password,
  ipAddress = null,
  userAgent = null,
}: MobileLoginInput) {
  const cleanIdentifier = identifier?.trim();

  if (!cleanIdentifier || !password) {
    await logMobileLoginActivity({
      identifier: cleanIdentifier || null,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: missing identifier or password",
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
      },
    ],
  });

  if (!user) {
    await logMobileLoginActivity({
      identifier: cleanIdentifier,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: user not found",
      reason: "USER_NOT_FOUND",
      ipAddress,
      userAgent,
    });

    return null;
  }

  const role = user.get("role") as Role | null;

  if (!user.isActive) {
    await logMobileLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: inactive account",
      reason: "INACTIVE_ACCOUNT",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Akun belum aktif atau sedang dinonaktifkan.");
  }

  if (!user.emailVerifiedAt) {
    await logMobileLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: email not verified",
      reason: "EMAIL_NOT_VERIFIED",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Email belum diverifikasi.");
  }

  if (!role || !MOBILE_ALLOWED_ROLES.includes(role.slug)) {
    await logMobileLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: role not allowed",
      reason: "ROLE_NOT_ALLOWED",
      role: role?.slug,
      ipAddress,
      userAgent,
    });

    throw new Error("Akun ini tidak memiliki akses ke aplikasi mobile.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    await logMobileLoginActivity({
      userId: user.id,
      identifier: cleanIdentifier,
      activity: ActivityType.MOBILE_LOGIN_FAILED,
      description: "Mobile login failed: invalid password",
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

  await logMobileLoginActivity({
    userId: user.id,
    identifier: cleanIdentifier,
    activity: ActivityType.MOBILE_LOGIN_SUCCESS,
    description: "Mobile user logged in successfully",
    reason: "LOGIN_SUCCESS",
    role: role.slug,
    ipAddress,
    userAgent,
  });

  return {
    user,
    role,
  };
}
