import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  videoStorageRoot: process.env.VIDEO_STORAGE_ROOT || "./storage/videos",
  appTimezone: process.env.APP_TIMEZONE || "Asia/Makassar"
};
