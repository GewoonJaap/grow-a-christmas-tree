import { ButtonContext, SlashCommandContext, MessageBuilder } from "interactions.ts";
import { APIMessage } from "discord-api-types/v10";

async function retryOperation<T>(operation: () => Promise<T>, retries = 1): Promise<T | undefined> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation().catch((error) => {
        console.error(`Operation failed on attempt ${attempt + 1}:`, error);
        if (attempt === retries) {
          console.error("Operation failed after all retries");
          return undefined;
        }
        throw error;
      });
    } catch (error) {
      // This catch block is necessary to handle the rethrown error from the .catch block above
    }
  }
  return undefined;
}

export async function safeReply(ctx: SlashCommandContext | ButtonContext, message: MessageBuilder): Promise<void> {
  await retryOperation(() => ctx.reply(message));
}

export async function safeEdit(ctx: ButtonContext, message: MessageBuilder): Promise<APIMessage | void> {
  return retryOperation(() => ctx.edit(message));
}
