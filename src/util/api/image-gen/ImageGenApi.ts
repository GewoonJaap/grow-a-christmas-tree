import { ITreeStyle } from "../../../models/Guild";
import { HasImageReponseType } from "../../types/api/ImageGenApi/HasImageResponseType";
import { ImageReponse } from "../../types/api/ImageGenApi/ImageResponseType";
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import RedisClient from "../../redisClient";

const logger = pino({
  level: "info"
});

export class ImageGenApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;

  private readonly getImageCacheKey = (guildId: string, treeLevel: number) => `image-gen:${guildId}:${treeLevel}`;
  private readonly getImageTTL = 60 * 5; // 5 minutes

  public constructor() {
    if (this.apiUrl === undefined) {
      throw new Error("IMAGE_GEN_API environment variable is not set");
    }
  }

  public async getGeneratedImage(guildId: string, treeLevel: number, treeStyles: ITreeStyle[]): Promise<ImageReponse> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getGeneratedImage", async (span) => {
      const redisClient = RedisClient.getInstance().getClient();

      const image = await redisClient.get(this.getImageCacheKey(guildId, treeLevel));
      if (image) {
        logger.info(`Getting image from cache for guild ${guildId} and tree level ${treeLevel}`);
        span.setStatus({ code: SpanStatusCode.OK });
        return JSON.parse(image);
      }

      treeLevel = Math.floor(treeLevel);
      logger.info(`Getting image for guild ${guildId} and tree level ${treeLevel}`);
      span.setAttribute("styles", JSON.stringify(treeStyles.map((style) => style.styleName)));
      try {
        const response = await fetch(`${this.apiUrl}/api/tree/${guildId}/${treeLevel}/image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ styles: treeStyles.map((style) => style.styleName) })
        });
        const jsonResponse = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });

        await redisClient.setEx(
          this.getImageCacheKey(guildId, treeLevel),
          this.getImageTTL,
          JSON.stringify(jsonResponse)
        );

        return jsonResponse;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return { success: false };
      } finally {
        span.end();
      }
    });
  }

  public async getHasGeneratedImage(guildId: string, treeLevel: number): Promise<boolean> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getHasGeneratedImage", async (span) => {
      treeLevel = Math.floor(treeLevel);
      logger.info(`Checking if image exists for guild ${guildId} and tree level ${treeLevel}`);
      try {
        const response = await fetch(`${this.apiUrl}/api/tree/${guildId}/${treeLevel}/has-image`);
        const jsonResponse = (await response.json()) as HasImageReponseType;
        span.setStatus({ code: SpanStatusCode.OK });
        return jsonResponse.exists;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return false;
      } finally {
        span.end();
      }
    });
  }
}
