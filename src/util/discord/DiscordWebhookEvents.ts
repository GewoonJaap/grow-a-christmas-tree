import { consumeEntitlement, SKU, SKU_REWARDS } from "./DiscordApiExtensions";
import { EntitlementCreateData } from "../types/discord/DiscordTypeExtension";
import { WalletHelper } from "../wallet/WalletHelper";
import { WheelStateHelper } from "../wheel/WheelStateHelper";

export async function handleEntitlementCreate(data: EntitlementCreateData) {
  console.log("Entitlement created:", data);
  const userId = data.user_id;
  const skuId = data.sku_id as SKU;
  const reward = SKU_REWARDS[skuId];

  if (reward && !reward.booster) {
    // Booster rewards are server bound and thus not supported this way
    await consumeEntitlement(data.id);

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
