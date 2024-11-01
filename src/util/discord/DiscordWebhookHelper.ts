import { WebhookCreatedResponse, WebhookMessageResponse } from "../types/discord/DiscordTypeExtension";

export async function createWebhook(
  channelId: string,
  name: string,
  avatarUrl: string
): Promise<WebhookCreatedResponse> {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: name,
      avatar: avatarUrl
    })
  });

  if (!response.ok) {
    throw new Error(`Error creating webhook: ${response.statusText}`);
  }

  return await response.json();
}

export async function sendWebhookMessage(
  webhookId: string,
  webhookToken: string,
  content: string
): Promise<WebhookMessageResponse> {
  const response = await fetch(`https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}?wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: content
    })
  });

  if (!response.ok) {
    throw new Error(`Error sending webhook message: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteWebhookMessage(webhookId: string, webhookToken: string, messageId: string): Promise<void> {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`,
    {
      method: "DELETE"
    }
  );

  if (!response.ok) {
    throw new Error(`Error deleting webhook message: ${response.statusText}`);
  }
}
