import { consumeEntitlement, SKU, SKU_REWARDS } from "./DiscordApiExtensions";
import { EntitlementCreateData } from "../types/discord/DiscordTypeExtension";
import { WalletHelper } from "../wallet/WalletHelper";
import { WheelStateHelper } from "../wheel/WheelStateHelper";
import { Metrics } from "../tracing/metrics";

export async function handleEntitlementCreate(data: EntitlementCreateData) {
  console.log("Entitlement created:", data);
  const userId = data.user_id;
  const skuId = data.sku_id as SKU;
  const reward = SKU_REWARDS[skuId];

  if (reward && !reward.booster && reward.isConsumable) {
    await consumeEntitlement(data.id, skuId);

    if (reward.coins > 0) {
      await WalletHelper.addCoins(userId, reward.coins);
      console.log(`Added ${reward.coins} coins to user ${userId}`);
    }

    if (reward.luckyTickets > 0) {
      await WheelStateHelper.addTickets(userId, reward.luckyTickets);
      console.log(`Added ${reward.luckyTickets} lucky tickets to user ${userId}`);
    }

    // Log item name and other relevant details when a purchase is made
    Metrics.recordShopPurchaseMetric(skuId, userId, data.guild_id ?? "unknown");
  } else {
    console.log(`No reward found for SKU ID: ${skuId}`);
  }
}
