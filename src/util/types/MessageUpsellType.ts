import { SKU } from "../discord/DiscordApiExtensions";

export interface MessageUpsellType {
  message: string;
  isUpsell: boolean;
  buttonSku?: SKU;
}
