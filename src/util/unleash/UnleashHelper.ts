import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { Context, initialize } from "unleash-client";

export const unleash = initialize({
  url: process.env.UNLEASH_URL ?? "http://unleash-web:4242/api",
  appName: "christmas-tree-bot",
  customHeaders: { Authorization: process.env.UNLEASH_TOKEN ?? "" }
});

export class UnleashHelper {
  static getUnleashContext(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<never> | ButtonContext<unknown>
  ): Context {
    return {
      userId: ctx.game?.id ?? ctx.user.id,
      properties: {
        hasAiAccess: (ctx.game?.hasAiAccess ?? false).toString(),
        size: ctx.game?.size ?? 0,
        hasSuperThirsty: (ctx.game?.superThirsty ?? false).toString(),
        contributorsAmount: ctx.game?.contributors.length ?? 0
      }
    };
  }
  static isEnabled(
    name: string,
    ctx: SlashCommandContext | ButtonContext | ButtonContext<never> | ButtonContext<unknown>,
    fallbackValue = false
  ): boolean {
    return unleash.isEnabled(name, this.getUnleashContext(ctx), fallbackValue);
  }
}
