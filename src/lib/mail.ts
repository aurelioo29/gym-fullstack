import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail({ to, subject, html, text }: SendMailParams) {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.warn("SMTP is not configured. Email skipped:", {
      to,
      subject,
    });

    return {
      skipped: true,
      message: "SMTP is not configured",
    };
  }

  const result = await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });

  return {
    skipped: false,
    messageId: result.messageId,
  };
}

export async function sendVerificationOtpEmail({
  to,
  fullName,
  code,
}: {
  to: string;
  fullName: string;
  code: string;
}) {
  return sendMail({
    to,
    subject: "Verify your Gym account",
    text: `Hi ${fullName}, your verification code is ${code}. This code will expire soon.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Verify your Gym account</h2>
        <p>Hi ${fullName},</p>
        <p>Use the OTP code below to verify your email:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire soon. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
