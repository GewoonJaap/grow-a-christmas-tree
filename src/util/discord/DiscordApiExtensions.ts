import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { Entitlement, EntitlementType } from "../types/discord/DiscordTypeExtension";
import { ButtonBuilder as OriginalButtonBuilder } from "interactions.ts";
import { ButtonStyle } from "discord-api-types/v10";
import axios from "axios";
import { BoosterName } from "../booster/BoosterHelper";
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const logger = pino({
  level: "info"
});

export enum SKU {
  FESTIVE_ENTITLEMENT = "1298016263687110697",
  SUPER_THIRSTY_ENTITLEMENT = "1298017583941029949",
  SUPER_THIRSTY_2_ENTITLEMENT = "1298016263687110698",
  SMALL_POUCH_OF_COINS = "1302385817846550611",
  GOLDEN_COIN_STASH = "1304819461366480946",
  LUCKY_COIN_BAG = "1304819131543195738",
  TREASURE_CHEST_OF_COINS = "1304819358442192936",
  HOLIDAY_LUCKY_TICKET = "1312106259608244287",
  LUCKY_TICKET_25 = "1312108891076690011",
  LUCKY_TICKET_50 = "1312108952905056316",
  GOLDEN_COIN_STASH_WATERING_BOOSTER = "1313226625738997872",
  TREASURE_CHEST_OF_COINS_WATERING_BOOSTER = "1313225955480698982"
}

export type SKURewardType = {
  coins: number;
  luckyTickets: number;
  booster: BoosterName | undefined;
  isConsumable: boolean;
};

export type SKURewardsType = {
  [key in SKU]: SKURewardType;
};

export const SKU_REWARDS: SKURewardsType = {
  [SKU.FESTIVE_ENTITLEMENT]: { coins: 0, luckyTickets: 0, booster: undefined, isConsumable: false },
  [SKU.SUPER_THIRSTY_ENTITLEMENT]: { coins: 0, luckyTickets: 0, booster: undefined, isConsumable: false },
  [SKU.SUPER_THIRSTY_2_ENTITLEMENT]: { coins: 0, luckyTickets: 0, booster: undefined, isConsumable: false },
  [SKU.SMALL_POUCH_OF_COINS]: { coins: 500, luckyTickets: 0, booster: undefined, isConsumable: true },
  [SKU.GOLDEN_COIN_STASH]: { coins: 5000, luckyTickets: 0, booster: undefined, isConsumable: true },
  [SKU.LUCKY_COIN_BAG]: { coins: 1500, luckyTickets: 0, booster: undefined, isConsumable: true },
  [SKU.TREASURE_CHEST_OF_COINS]: { coins: 3000, luckyTickets: 0, booster: undefined, isConsumable: true },
  [SKU.HOLIDAY_LUCKY_TICKET]: { coins: 0, luckyTickets: 10, booster: undefined, isConsumable: true },
  [SKU.LUCKY_TICKET_25]: { coins: 0, luckyTickets: 25, booster: undefined, isConsumable: true },
  [SKU.LUCKY_TICKET_50]: { coins: 0, luckyTickets: 50, booster: undefined, isConsumable: true },
  [SKU.GOLDEN_COIN_STASH_WATERING_BOOSTER]: {
    coins: 5000,
    luckyTickets: 0,
    booster: "Watering Booster",
    isConsumable: true
  },
  [SKU.TREASURE_CHEST_OF_COINS_WATERING_BOOSTER]: {
    coins: 3000,
    luckyTickets: 0,
    booster: "Watering Booster",
    isConsumable: true
  }
};

export function getEntitlements(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
  withoutExpired = false
): Entitlement[] {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getEntitlements", (span) => {
    try {
      const interaction = ctx.interaction;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entitlements: Entitlement[] = (interaction as any).entitlements;
      if (withoutExpired) {
        return entitlements.filter((entitlement) => !hasEntitlementExpired(entitlement));
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return entitlements;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function entitlementSkuResolver(skuId: string): EntitlementType {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("entitlementSkuResolver", (span) => {
    try {
      let result: EntitlementType;
      if (skuId === SKU.FESTIVE_ENTITLEMENT) {
        result = EntitlementType.UNLIMITED_LEVELS;
      } else if (skuId === SKU.SUPER_THIRSTY_ENTITLEMENT || skuId === SKU.SUPER_THIRSTY_2_ENTITLEMENT) {
        result = EntitlementType.SUPER_THIRSTY;
      } else {
        result = EntitlementType.UNKNOWN;
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function hasEntitlementExpired(entitlement: Entitlement): boolean {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("hasEntitlementExpired", (span) => {
    try {
      let result: boolean;
      if (entitlement.consumed) {
        result = true;
      } else if (!entitlement.ends_at) {
        result = false;
      } else {
        result = new Date(entitlement.ends_at) < new Date();
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function updateEntitlementsToGame(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>
): Promise<void> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("updateEntitlementsToGame", async (span) => {
    try {
      if (ctx.game == null) return;

      const userId = ctx.user.id;
      const entitlementsFromApi = await fetchEntitlementsFromApi(userId, true, ctx.interaction.guild_id ?? ctx.game.id);
      const entitlementsFromInteraction = getEntitlements(ctx, true);
      const entitlements = [...entitlementsFromApi, ...entitlementsFromInteraction];

      const hasUnlimitedLevels = entitlements.some(
        (entitlement) => entitlementSkuResolver(entitlement.sku_id) === EntitlementType.UNLIMITED_LEVELS
      );

      const hasSuperThirsty = entitlements.some(
        (entitlement) => entitlementSkuResolver(entitlement.sku_id) === EntitlementType.SUPER_THIRSTY
      );

      ctx.game.hasAiAccess = hasUnlimitedLevels;
      if (ctx.game.superThirsty === undefined || !ctx.game.superThirsty) {
        ctx.game.superThirsty = hasSuperThirsty;
      }

      await ctx.game.save();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      logger.error(error);
    } finally {
      span.end();
    }
  });
}

export async function fetchEntitlementsFromApi(
  userId: string,
  withoutExpired = false,
  guildId: string | null | undefined,
  skuIds?: SKU[]
): Promise<Entitlement[]> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("fetchEntitlementsFromApi", async (span) => {
    if (!guildId) {
      return [];
    }
    try {
      let url = `https://discord.com/api/v10/applications/${process.env.CLIENT_ID}/entitlements?user_id=${userId}`;
      if (skuIds) {
        url += `&sku_ids=${skuIds.join(",")}`;
      }
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bot ${process.env.TOKEN}`
        }
      });
      let data: Entitlement[] = response.data;

      data = data.filter((entitlement) => !entitlement.guild_id || entitlement.guild_id === guildId);

      if (withoutExpired) {
        return data.filter((entitlement) => !hasEntitlementExpired(entitlement));
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return data;
    } catch (error: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      return [];
    } finally {
      span.end();
    }
  });
}

export function getRandomButtonStyle(): ButtonStyle {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getRandomButtonStyle", (span) => {
    try {
      const result = (Math.floor(Math.random() * 4) + 1) as ButtonStyle;
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function consumeEntitlement(entitlementId: string, skuId: SKU): Promise<boolean> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("consumeEntitlement", async (span) => {
    try {
      if (!SKU_REWARDS[skuId].isConsumable) {
        return false;
      }

      const url = `https://discord.com/api/v10/applications/${process.env.CLIENT_ID}/entitlements/${entitlementId}/consume`;
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Bot ${process.env.TOKEN}`
          }
        }
      );

      if (response.status !== 204) {
        return false;
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return true;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export class PremiumButtonBuilder extends OriginalButtonBuilder {
  private sku_id?: SKU;

  /**
   * Set the sku_id for the premium button.
   * @param {SKU} sku_id - The sku_id to set.
   * @returns {this}
   */
  public setSkuId(sku_id: SKU): this {
    this.sku_id = sku_id;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setStyle(style: ButtonStyle): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.setStyle(6 as any);
  }

  public toJSON() {
    const json = super.toJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.sku_id) (json as unknown as any).sku_id = this.sku_id;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    json.style = 6;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete json.custom_id;
    delete json.label;
    delete json.emoji;

    return json;
  }
}
