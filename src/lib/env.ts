export const env = {
  app: {
    name: process.env.APP_NAME || "Gym Backend",
    url: process.env.APP_URL || "http://localhost:3000",
    env: process.env.APP_ENV || "development",
  },

  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || "gym_backend",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  },

  auth: {
    nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
    nextAuthSecret: process.env.NEXTAUTH_SECRET || "change_this_secret",
    jwtAccessSecret:
      process.env.JWT_ACCESS_SECRET || "change_this_access_secret",
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET || "change_this_refresh_secret",
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Gym App <noreply@gym.com>",
  },

  otp: {
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
    resendCooldownSeconds: Number(
      process.env.OTP_RESEND_COOLDOWN_SECONDS || 60,
    ),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  },
};
