import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { Context, initialize } from "unleash-client";

export const unleash = initialize({
  url: process.env.UNLEASH_URL ?? "http://unleash-web:4242/api",
  appName: "christmas-tree-bot",
  customHeaders: { Authorization: process.env.UNLEASH_TOKEN ?? "" }
});
export interface UnleashFeatureType {
  name: string;
  fallbackValue: boolean;
}

export const UNLEASH_FEATURES = {
  autoBan: {
    name: "auto-ban",
    fallbackValue: false
  },
  banEnforcement: {
    name: "ban-enforcing",
    fallbackValue: false
  },
  antiAutoClickerPenalty: {
    name: "anti-autoclicker-penalty",
    fallbackValue: false
  },
  antiAutoClickerLogging: {
    name: "anti-auto-clicker-logging",
    fallbackValue: false
  },
  autoFailedAttemptsBan: {
    name: "auto-failed-attempts-ban",
    fallbackValue: false
  },
  autoExcessiveWateringBan: {
    name: "auto-excessive-watering-ban",
    fallbackValue: false
  },
  showCheaterClown: {
    name: "show-cheater-clown",
    fallbackValue: false
  }
};

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
    feature: UnleashFeatureType,
    ctx: SlashCommandContext | ButtonContext | ButtonContext<never> | ButtonContext<unknown>
  ): boolean {
    return unleash.isEnabled(feature.name, this.getUnleashContext(ctx), feature.fallbackValue);
  }
}
