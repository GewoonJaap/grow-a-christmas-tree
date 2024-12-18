import {
  ButtonContext,
  SlashCommandContext,
  MessageBuilder,
  SelectMenuContext,
  AutocompleteContext,
  UserCommandContext,
  MessageCommandContext
} from "interactions.ts";
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
        console.log(`Retrying operation in 1 second...`);
      });
    } catch (error) {
      // This catch block is necessary to handle the rethrown error from the .catch block above
    }
  }
  return undefined;
}

export async function safeReply(
  ctx:
    | SlashCommandContext
    | ButtonContext
    | ButtonContext<unknown>
    | SelectMenuContext<unknown>
    | AutocompleteContext
    | UserCommandContext
    | MessageCommandContext,
  message: MessageBuilder | unknown[]
): Promise<void> {
  await retryOperation(() => ctx.reply(message as any));
}

export async function safeEdit(
  ctx: ButtonContext | ButtonContext<unknown> | SlashCommandContext | SelectMenuContext<unknown>,
  message: MessageBuilder
): Promise<APIMessage | void> {
  return retryOperation(() => ctx.edit(message));
}
