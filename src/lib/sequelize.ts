import { Sequelize } from "sequelize";

const database = process.env.DB_NAME || "gym_backend";
const username = process.env.DB_USER || "postgres";
const password = process.env.DB_PASSWORD || "";
const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 5432);

declare global {
  var sequelize: Sequelize | undefined;
}

export const sequelize =
  global.sequelize ||
  new Sequelize(database, username, password, {
    host,
    port,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.sequelize = sequelize;
}

export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    return {
      connected: true,
      message: "Database connected successfully",
    };
  } catch (error) {
    console.error("Database connection failed:", error);

    return {
      connected: false,
      message: "Database connection failed",
      error,
    };
  }
}
