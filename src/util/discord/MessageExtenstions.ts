import { ButtonContext, SlashCommandContext, MessageBuilder } from "interactions.ts";
import { APIMessage } from "discord-api-types/v10";

async function retryOperation<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Operation failed on attempt ${attempt + 1}:`, error);
      if (attempt === retries) {
        console.error("Operation failed after all retries");
      }
    }
  }
  console.error("Operation failed after all retries");
}

export async function safeReply(ctx: SlashCommandContext | ButtonContext, message: MessageBuilder): Promise<void> {
  return retryOperation(() => ctx.reply(message));
}

export async function safeEdit(ctx: ButtonContext, message: MessageBuilder): Promise<APIMessage> {
  return retryOperation(() => ctx.edit(message));
}
