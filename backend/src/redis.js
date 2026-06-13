import { createClient } from "redis";
import { config } from "./config.js";

export const redis = createClient({
  url: config.redisUrl,
  socket: {
    reconnectStrategy: false
  }
});

redis.on("error", (error) => {
  console.warn("Redis unavailable:", error.message);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    try {
      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Redis connection timed out")), 500);
        })
      ]);
    } catch (error) {
      console.warn("Continuing without Redis:", error.message);
    }
  }
}
