import { createClient } from "redis";
// import redisPoolFactory from "redis-connection-pool";

// export const redisPool = await redisPoolFactory("myRedisPool", {
//   max_clients: Number(process.env.REDIS_MAX_CLIENTS || 5), // default
//   redis: {
//     url: process.env.REDIS_URL || "redis://localhost:6379",
//   },
// });

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
