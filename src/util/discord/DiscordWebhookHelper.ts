import { WebhookCreatedResponse, WebhookMessageResponse } from "../types/discord/DiscordTypeExtension";
import { trace, SpanStatusCode } from "@opentelemetry/api";

export async function createWebhook(
  channelId: string,
  name: string,
  avatarUrl: string
): Promise<WebhookCreatedResponse> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("createWebhook", async (span) => {
    try {
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

      span.setStatus({ code: SpanStatusCode.OK });
      return await response.json();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function sendWebhookMessage(
  webhookId: string,
  webhookToken: string,
  content: string
): Promise<WebhookMessageResponse> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("sendWebhookMessage", async (span) => {
    try {
      const response = await fetch(`https://discord.com/api/webhooks/${webhookId}/${webhookToken}?wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: content,
          avatar_url: "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/stage-5.png"
        })
      });

      if (!response.ok) {
        throw new Error(`Error sending webhook message: ${response.statusText}`);
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return await response.json();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function deleteWebhookMessage(webhookId: string, webhookToken: string, messageId: string): Promise<void> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("deleteWebhookMessage", async (span) => {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error(`Error deleting webhook message: ${response.statusText}`);
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
