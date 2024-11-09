import { consumeEntitlement, skuIdToCoins } from "./DiscordApiExtensions";
import { EntitlementCreateData } from "../types/discord/DiscordTypeExtension";
import { WalletHelper } from "../wallet/WalletHelper";

export async function handleEntitlementCreate(data: EntitlementCreateData) {
  console.log("Entitlement created:", data);
  const userId = data.user_id;
  const skuId = data.sku_id;
  const coins = skuIdToCoins(skuId);

  if (coins > 0) {
    await consumeEntitlement(data.id);
    await WalletHelper.addCoins(userId, coins);
    console.log(`Added ${coins} coins to user ${userId}`);
  }
}
