import { FestiveImageStyle } from "../ImageStylesApi/FestiveStyleResponseType";

export interface DailyItemShopResponse {
  success: boolean;
  items: Record<StyleItemRarity, ItemShopStyleItem[]>;
}

export type StyleItemRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface ItemShopStyleItem extends FestiveImageStyle {
  rarity: StyleItemRarity;
}
