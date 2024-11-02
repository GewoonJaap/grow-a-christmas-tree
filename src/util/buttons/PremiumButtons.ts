import { FESTIVE_ENTITLEMENT_SKU_ID, PremiumButtonBuilder } from "../discord/DiscordApiExtensions";

export class PremiumButtons {
  /**
   * A button that allows users to purschage the Festive Forest
   */
  static FestiveForestButton = new PremiumButtonBuilder().setSkuId(FESTIVE_ENTITLEMENT_SKU_ID);
}
