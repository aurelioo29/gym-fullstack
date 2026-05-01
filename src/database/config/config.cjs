require("dotenv").config();

const baseConfig = {
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "gym_backend",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  dialect: "postgres",
  logging: false,
};

module.exports = {
  development: baseConfig,

  test: {
    ...baseConfig,
    database: `${baseConfig.database}_test`,
  },

  production: {
    ...baseConfig,
    logging: false,
  },
};