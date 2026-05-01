import { Transaction } from "sequelize";
import { addMinutes } from "date-fns";
import { env } from "@/lib/env";
import { VerificationCode } from "@/database/models";

export function generateOtpCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export function getOtpExpiresAt() {
  return addMinutes(new Date(), env.otp.expiresMinutes);
}

export async function createEmailVerificationCode({
  userId,
  email,
  transaction,
}: {
  userId: string;
  email: string;
  transaction?: Transaction;
}) {
  const code = generateOtpCode();

  await VerificationCode.create(
    {
      userId,
      email,
      code,
      type: "EMAIL_VERIFICATION",
      expiresAt: getOtpExpiresAt(),
      verifiedAt: null,
      attempts: 0,
      lastSentAt: new Date(),
    },
    { transaction },
  );

  return code;
}
