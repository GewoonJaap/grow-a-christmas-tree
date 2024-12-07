import {
  FESTIVE_ENTITLEMENT_SKU_ID,
  PremiumButtonBuilder,
  SMALL_POUCH_OF_COINS_SKU_ID,
  SUPER_THIRSTY_ENTITLEMENT_SKU_ID,
  HOLIDAY_LUCKY_TICKET,
  LUCKY_TICKET_25,
  LUCKY_TICKET_50,
  LUCKY_COIN_BAG_SKU_ID
} from "../discord/DiscordApiExtensions";

export class PremiumButtons {
  /**
   * A button that allows users to purchase the Festive Forest
   */
  static FestiveForestButton = new PremiumButtonBuilder().setSkuId(FESTIVE_ENTITLEMENT_SKU_ID);

  /**
   * A button that allows users to purchase a small pouch of coins
   */
  static SmallPouchOfCoinsButton = new PremiumButtonBuilder().setSkuId(SMALL_POUCH_OF_COINS_SKU_ID);

  /**
   * A button that allows users to purchase the Lucky Coin Bag
   */
  static LuckyCoinBagButton = new PremiumButtonBuilder().setSkuId(LUCKY_COIN_BAG_SKU_ID);

  /**
   * A button that allows users to purchase the Super Thirsty entitlement
   */
  static SuperThirstyButton = new PremiumButtonBuilder().setSkuId(SUPER_THIRSTY_ENTITLEMENT_SKU_ID);

  /**
   * A button that allows users to purchase the Holiday Lucky Ticket
   */
  static HolidayLuckyTicketButton = new PremiumButtonBuilder().setSkuId(HOLIDAY_LUCKY_TICKET);

  /**
   * A button that allows users to purchase 25 Lucky Tickets
   */
  static LuckyTicket25Button = new PremiumButtonBuilder().setSkuId(LUCKY_TICKET_25);

  /**
   * A button that allows users to purchase 50 Lucky Tickets
   */
  static LuckyTicket50Button = new PremiumButtonBuilder().setSkuId(LUCKY_TICKET_50);
}
