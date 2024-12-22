import { logger } from "../../../tracing/pinoLogger";
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
    if (this.cachedStyles != undefined && this.isCacheValid(this.cachedStyles)) {
      return this.cachedStyles.data;
    }
    try {
      const response = await fetch(`${this.apiUrl}/api/styles`, {
        method: "GET"
      });
      const jsonData = await response.json();
      this.cacheStylesResponse(jsonData);
      return jsonData;
    } catch (error) {
      logger.error(error);
      return { success: false, styles: [] };
    }
  }

  public async getImageStyleImage(styleName: string): Promise<ImageReponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/styles/${styleName}/image`, {
        method: "GET"
      });
      return await response.json();
    } catch (error) {
      logger.error(error);
      return { success: false };
    }
  }

  public async hasImageStyleImage(styleName: string): Promise<HasImageReponseType> {
    try {
      const response = await fetch(`${this.apiUrl}/api/styles/${styleName}/has-image`, {
        method: "GET"
      });
      return await response.json();
    } catch (error) {
      logger.error(error);
      return { exists: false };
    }
  }

  public async generateImageStyles(): Promise<ImageReponse[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/styles/generate`, {
        method: "GET"
      });
      return await response.json();
    } catch (error) {
      logger.error(error);
      return [];
    }
  }

  public async getFestiveImageStyles(): Promise<FestiveImageStylesReponse> {
    if (this.cachedFestiveStyles != undefined && this.isCacheValid(this.cachedFestiveStyles)) {
      return this.cachedFestiveStyles.data;
    }
    try {
      const response = await fetch(`${this.apiUrl}/api/styles/active-festive-styles`, {
        method: "GET"
      });
      const data = await response.json();
      this.cacheFestiveStylesResponse(data);
      return data;
    } catch (error) {
      logger.error(error);
      return { success: false, styles: [] };
    }
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
