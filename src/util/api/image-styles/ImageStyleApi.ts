import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const logger = pino({
  level: "info"
});
import { CachedResponse } from "../../types/api/CachedResponseType";
import { HasImageReponseType } from "../../types/api/ImageGenApi/HasImageResponseType";
import { ImageReponse } from "../../types/api/ImageGenApi/ImageResponseType";
import { FestiveImageStylesReponse } from "../../types/api/ImageStylesApi/FestiveStyleResponseType";
import { ImageStylesReponse } from "../../types/api/ImageStylesApi/ImageStylesResponseType";

export class ImageStylesApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;
  private cachedStyles: CachedResponse<ImageStylesReponse> | undefined;
  private cachedFestiveStyles: CachedResponse<FestiveImageStylesReponse> | undefined;

  public constructor() {
    if (this.apiUrl === undefined) {
      throw new Error("IMAGE_GEN_API environment variable is not set");
    }
  }

  public async getImageStyles(): Promise<ImageStylesReponse> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getImageStyles", async (span) => {
      if (this.cachedStyles != undefined && this.isCacheValid(this.cachedStyles)) {
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return this.cachedStyles.data;
      }
      try {
        const response = await fetch(`${this.apiUrl}/api/styles`, {
          method: "GET"
        });
        const jsonData = await response.json();
        this.cacheStylesResponse(jsonData);
        span.setStatus({ code: SpanStatusCode.OK });
        return jsonData;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return { success: false, styles: [] };
      } finally {
        span.end();
      }
    });
  }

  public async getImageStyleImage(styleName: string): Promise<ImageReponse> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getImageStyleImage", async (span) => {
      try {
        const response = await fetch(`${this.apiUrl}/api/styles/${styleName}/image`, {
          method: "GET"
        });
        const jsonData = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return jsonData;
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

  public async hasImageStyleImage(styleName: string): Promise<HasImageReponseType> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("hasImageStyleImage", async (span) => {
      try {
        const response = await fetch(`${this.apiUrl}/api/styles/${styleName}/has-image`, {
          method: "GET"
        });
        const jsonData = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return jsonData;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return { exists: false };
      } finally {
        span.end();
      }
    });
  }

  public async generateImageStyles(): Promise<ImageReponse[]> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("generateImageStyles", async (span) => {
      try {
        const response = await fetch(`${this.apiUrl}/api/styles/generate`, {
          method: "GET"
        });
        const jsonData = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return jsonData;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return [];
      } finally {
        span.end();
      }
    });
  }

  public async getFestiveImageStyles(): Promise<FestiveImageStylesReponse> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getFestiveImageStyles", async (span) => {
      if (this.cachedFestiveStyles != undefined && this.isCacheValid(this.cachedFestiveStyles)) {
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return this.cachedFestiveStyles.data;
      }
      try {
        const response = await fetch(`${this.apiUrl}/api/styles/active-festive-styles`, {
          method: "GET"
        });
        const data = await response.json();
        this.cacheFestiveStylesResponse(data);
        span.setStatus({ code: SpanStatusCode.OK });
        return data;
      } catch (error) {
        logger.error(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        return { success: false, styles: [] };
      } finally {
        span.end();
      }
    });
  }

  private isCacheValid(cachedData: CachedResponse<unknown> | undefined): boolean {
    if (!cachedData) return false;
    return cachedData.expiresAt > Date.now();
  }

  private cacheStylesResponse(response: ImageStylesReponse): void {
    this.cachedStyles = { data: response, cachedAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60 };
  }

  private cacheFestiveStylesResponse(response: FestiveImageStylesReponse): void {
    this.cachedFestiveStyles = { data: response, cachedAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60 };
  }
}
