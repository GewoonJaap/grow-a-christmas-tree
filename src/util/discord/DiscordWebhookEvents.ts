import { consumeEntitlement, SKU, SKU_REWARDS } from "./DiscordApiExtensions";
import { EntitlementCreateData } from "../types/discord/DiscordTypeExtension";
import { WalletHelper } from "../wallet/WalletHelper";
import { WheelStateHelper } from "../wheel/WheelStateHelper";

export async function handleEntitlementCreate(data: EntitlementCreateData) {
  console.log("Entitlement created:", data);
  const userId = data.user_id;
  const skuId = data.sku_id as SKU;
  const reward = SKU_REWARDS[skuId];

  const consumableSkus = [
    SKU.SMALL_POUCH_OF_COINS,
    SKU.GOLDEN_COIN_STASH,
    SKU.LUCKY_COIN_BAG,
    SKU.TREASURE_CHEST_OF_COINS,
    SKU.HOLIDAY_LUCKY_TICKET,
    SKU.LUCKY_TICKET_25,
    SKU.LUCKY_TICKET_50,
    SKU.GOLDEN_COIN_STASH_WATERING_BOOSTER,
    SKU.TREASURE_CHEST_OF_COINS_WATERING_BOOSTER
  ];

  if (reward && !reward.booster && consumableSkus.includes(skuId)) {
    await consumeEntitlement(data.id, skuId);

    if (reward.coins > 0) {
      await WalletHelper.addCoins(userId, reward.coins);
      console.log(`Added ${reward.coins} coins to user ${userId}`);
    }

    if (reward.luckyTickets > 0) {
      await WheelStateHelper.addTickets(userId, reward.luckyTickets);
      console.log(`Added ${reward.luckyTickets} lucky tickets to user ${userId}`);
    }
  } else {
    console.log(`No reward found for SKU ID: ${skuId}`);
  }
}
