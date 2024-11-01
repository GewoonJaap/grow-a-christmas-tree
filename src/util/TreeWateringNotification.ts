import { sendWebhookMessage, deleteWebhookMessage } from "../util/discord/DiscordWebhookHelper";

export async function sendAndDeleteWebhookMessage(
  webhookId: string,
  webhookToken: string,
  roleId: string,
  content: string
): Promise<void> {
  try {
    // Send the webhook message
    const messageContent = `<@&${roleId}> ${content}`;
    await sendWebhookMessage(webhookId, webhookToken, messageContent);

    // Here you would normally get the message ID from the response of sendWebhookMessage
    // For now, we'll assume you will supply the message ID later
    const messageId = "MESSAGE_ID_TO_BE_SUPPLIED";

    setTimeout(async () => {
      await deleteWebhookMessage(webhookId, webhookToken, messageId);
    }, 10 * 1000); // 10 seconds
  } catch (error) {
    console.error(error);
  }
}
