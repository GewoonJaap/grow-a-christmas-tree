import { Metrics } from "../tracing/metrics";
import pino from "pino";

const logger = pino({
  level: "info"
});
import { sendWebhookMessage, deleteWebhookMessage } from "../util/discord/DiscordWebhookHelper";

export async function sendAndDeleteWebhookMessage(
  webhookId: string,
  webhookToken: string,
  roleId: string,
  content: string
): Promise<void> {
  try {
    Metrics.recordDiscordSendWebhookMessage(content);
    // Send the webhook message
    const messageContent = `<@&${roleId}> ${content}`;
    const result = await sendWebhookMessage(webhookId, webhookToken, messageContent);

    setTimeout(async () => {
      await deleteWebhookMessage(webhookId, webhookToken, result.id);
    }, 10 * 1000); // 10 seconds
  } catch (error) {
    logger.error(error);
  }
}
