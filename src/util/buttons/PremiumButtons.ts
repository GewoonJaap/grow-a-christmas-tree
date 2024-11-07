import {
  FESTIVE_ENTITLEMENT_SKU_ID,
  PremiumButtonBuilder,
  SMALL_POUCH_OF_COINS_SKU_ID
} from "../discord/DiscordApiExtensions";

export class PremiumButtons {
  /**
   * A button that allows users to purschage the Festive Forest
   */
  static FestiveForestButton = new PremiumButtonBuilder().setSkuId(FESTIVE_ENTITLEMENT_SKU_ID);

  /**
   * A button that allows users to purschage a small pouch of coins
   */
  static SmallPouchOfCoinsButton = new PremiumButtonBuilder().setSkuId(SMALL_POUCH_OF_COINS_SKU_ID);
}
