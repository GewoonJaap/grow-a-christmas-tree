import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://redis"
});

redisClient.on("error", (err) => {
  console.error("Redis client error", err);
});

redisClient.connect();

export default redisClient;
