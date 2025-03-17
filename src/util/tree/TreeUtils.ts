import { ButtonContext, SlashCommandContext } from "interactions.ts";
import RedisClient from "../redisClient";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { Guild } from "../../models/Guild";

export class TreeUtils {
  /**
   * Find the position of a tree in the forest leaderboard
   * @param treeId The ID of the tree to find
   * @returns The position (1 is first position) of the tree, or -1 if not found
   */
  static async findTreePosition(context: SlashCommandContext | ButtonContext<unknown>): Promise<number> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("findTreePosition", async (span) => {
      if (!context.game) {
        return -1;
      }
      try {
        // Try to get from cache first
        const redisClient = RedisClient.getInstance().getClient();
        const cacheKey = `treePosition:${context.game.id}`;
        const cachedPosition = await redisClient.get(cacheKey);

        if (cachedPosition) {
          span.setStatus({ code: SpanStatusCode.OK });
          return parseInt(cachedPosition, 10);
        }

        // Count how many trees are taller (have higher size)
        let largerTreesCount = await Guild.countDocuments({ size: { $gt: context.game.size } });
        largerTreesCount += 1; // 1 is first position instead of 0

        // Cache the result for 60 seconds
        await redisClient.setEx(cacheKey, 60, largerTreesCount.toString());

        span.setStatus({ code: SpanStatusCode.OK });
        return largerTreesCount;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        console.error("Error finding tree position:", error);
        return -1;
      } finally {
        span.end();
      }
    });
  }
}
