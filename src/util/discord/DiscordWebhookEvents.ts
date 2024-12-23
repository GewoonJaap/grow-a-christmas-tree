import { consumeEntitlement, SKU, SKU_REWARDS } from "./DiscordApiExtensions";
import { EntitlementCreateData } from "../types/discord/DiscordTypeExtension";
import { WalletHelper } from "../wallet/WalletHelper";
import { WheelStateHelper } from "../wheel/WheelStateHelper";
import { Metrics } from "../../tracing/metrics";
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const logger = pino({
  level: "info"
});

export async function handleEntitlementCreate(data: EntitlementCreateData) {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("handleEntitlementCreate", async (span) => {
    try {
      logger.info("Entitlement created:", data);
      const userId = data.user_id;
      const skuId = data.sku_id as SKU;
      const reward = SKU_REWARDS[skuId];

      if (reward && !reward.booster && reward.isConsumable) {
        await consumeEntitlement(data.id, skuId);

        if (reward.coins > 0) {
          await WalletHelper.addCoins(userId, reward.coins);
          logger.info(`Added ${reward.coins} coins to user ${userId}`);
        }

        if (reward.luckyTickets > 0) {
          await WheelStateHelper.addTickets(userId, reward.luckyTickets);
          logger.info(`Added ${reward.luckyTickets} lucky tickets to user ${userId}`);
        }

        // Log item name and other relevant details when a purchase is made
        Metrics.recordShopPurchaseMetric(skuId, userId, "unknown");
      } else {
        logger.info(`No reward found for SKU ID: ${skuId}`);
      }
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
