import { createClient, RedisClientType } from "redis";
import { Metrics } from "../tracing/metrics";

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private isConnected = false;

  private constructor() {
    this.client = createClient({
      url: "redis://redis"
    });

    this.client.on("error", (err) => {
      console.error("Redis client error", err);
      Metrics.logError(err, "Redis Client Error");
    });

    this.client.on("end", () => {
      console.warn("Redis client disconnected. Attempting to reconnect...");
      this.isConnected = false;
      this.reconnect();
    });

    this.client.on("reconnecting", () => {
      console.info("Redis client reconnecting...");
    });

    this.client.on("connect", () => {
      console.info("Redis client connected");
      this.isConnected = true;
    });

    this.client.connect().catch((err) => {
      console.error("Redis client connection error", err);
      Metrics.logError(err, "Redis Client Connection Error");
    });
  }

  private reconnect() {
    this.client.connect().catch((err) => {
      console.error("Redis client reconnection error", err);
      Metrics.logError(err, "Redis Client Reconnection Error");
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (err) {
      console.error("Redis client connection error", err);
      Metrics.logError(err as Error, "Redis Client Connection Error");
      throw err;
    }
  }
}

export default RedisClient;
