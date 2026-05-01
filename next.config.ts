import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["sequelize", "pg", "pg-hstore"],
};

export default nextConfig;
