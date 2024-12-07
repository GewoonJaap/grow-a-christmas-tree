import { CachedResponse } from "../../types/api/CachedResponseType";
import { ImageStylesReponse } from "../../types/api/ImageStylesApi/ImageStylesReponseType";

export class ImageStylesApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;
  private cachedStyles: CachedResponse<ImageStylesReponse> | undefined;

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
      console.error(error);
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
}
