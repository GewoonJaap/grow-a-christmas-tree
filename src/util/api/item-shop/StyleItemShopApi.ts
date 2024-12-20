import { CachedResponse } from "../../types/api/CachedResponseType";
import { DailyItemShopResponse } from "../../types/api/ItemShopApi/DailyItemShopResponseType";

export type DailyItemShopStylesResult = {
  data: DailyItemShopResponse;
  fromCache: boolean;
};

export class StyleItemShopApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;
  private cachedDailyItems: CachedResponse<DailyItemShopResponse> | undefined;

  public constructor() {
    if (this.apiUrl === undefined) {
      throw new Error("ITEM_SHOP_API environment variable is not set");
    }
  }

  public async getDailyItemShopStyles(): Promise<DailyItemShopStylesResult> {
    if (this.cachedDailyItems != undefined && this.isCacheValid(this.cachedDailyItems)) {
      return { data: this.cachedDailyItems.data, fromCache: true };
    }
    try {
      const response = await fetch(`${this.apiUrl}/api/item-shop/styles/daily-items`, {
        method: "GET"
      });
      const jsonData = await response.json();
      this.cacheDailyItemsResponse(jsonData);
      return { data: jsonData, fromCache: false };
    } catch (error) {
      console.error(error);
      return {
        data: {
          success: false,
          items: { Common: [], Rare: [], Epic: [], Legendary: [] },
          refreshTime: new Date().toUTCString()
        },
        fromCache: false
      };
    }
  }

  private isCacheValid(cachedData: CachedResponse<unknown> | undefined): boolean {
    if (!cachedData) return false;
    return cachedData.expiresAt > Date.now();
  }

  private cacheDailyItemsResponse(response: DailyItemShopResponse): void {
    this.cachedDailyItems = { data: response, cachedAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60 };
  }
}
