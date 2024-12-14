import { PremiumButtonBuilder, SKU } from "../discord/DiscordApiExtensions";

export class PremiumButtons {
  /**
   * A button that allows users to purchase the Festive Forest
   */
  static FestiveForestButton = new PremiumButtonBuilder().setSkuId(SKU.FESTIVE_ENTITLEMENT);

  /**
   * A button that allows users to purchase a small pouch of coins
   */
  static SmallPouchOfCoinsButton = new PremiumButtonBuilder().setSkuId(SKU.SMALL_POUCH_OF_COINS);

  /**
   * A button that allows users to purchase the Lucky Coin Bag
   */
  static LuckyCoinBagButton = new PremiumButtonBuilder().setSkuId(SKU.LUCKY_COIN_BAG);

  /**
   * A button that allows users to purchase the Super Thirsty entitlement
   */
  static SuperThirstyButton = new PremiumButtonBuilder().setSkuId(SKU.SUPER_THIRSTY_ENTITLEMENT);

  /**
   * A button that allows users to purchase the Holiday Lucky Ticket
   */
  static HolidayLuckyTicketButton = new PremiumButtonBuilder().setSkuId(SKU.HOLIDAY_LUCKY_TICKET);

  /**
   * A button that allows users to purchase 25 Lucky Tickets
   */
  static LuckyTicket25Button = new PremiumButtonBuilder().setSkuId(SKU.LUCKY_TICKET_25);

  /**
   * A button that allows users to purchase 50 Lucky Tickets
   */
  static LuckyTicket50Button = new PremiumButtonBuilder().setSkuId(SKU.LUCKY_TICKET_50);
}
