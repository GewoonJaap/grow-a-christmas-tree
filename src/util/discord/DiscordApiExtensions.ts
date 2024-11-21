import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { Entitlement, EntitlementType } from "../types/discord/DiscordTypeExtension";
import { ButtonBuilder as OriginalButtonBuilder } from "interactions.ts";
import { ButtonStyle } from "discord-api-types/v10";
import axios from "axios";

export const FESTIVE_ENTITLEMENT_SKU_ID = "1298016263687110697";
export const SUPER_THIRSTY_ENTITLEMENT_SKU_ID = "1298017583941029949";
export const SUPER_THIRSTY_2_ENTITLEMENT_SKU_ID = "1298016263687110698";
export const SMALL_POUCH_OF_COINS_SKU_ID = "1302385817846550611";
export const GOLDEN_COIN_STASH_SKU_ID = "1304819461366480946";
export const LUCKY_COIN_BAG_SKU_ID = "1304819131543195738";
export const TREASURE_CHEST_OF_COINS_SKU_ID = "1304819358442192936";

export function getEntitlements(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
  withoutExpired = false
): Entitlement[] {
  const interaction = ctx.interaction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entitlements: Entitlement[] = (interaction as any).entitlements;
  if (withoutExpired) {
    return entitlements.filter((entitlement) => !hasEntitlementExpired(entitlement));
  }
  return entitlements;
}

export function entitlementSkuResolver(skuId: string): EntitlementType {
  if (skuId === FESTIVE_ENTITLEMENT_SKU_ID) {
    return EntitlementType.UNLIMITED_LEVELS;
  }
  if (skuId === SUPER_THIRSTY_ENTITLEMENT_SKU_ID || skuId === SUPER_THIRSTY_2_ENTITLEMENT_SKU_ID) {
    return EntitlementType.SUPER_THIRSTY;
  }
  return EntitlementType.UNKNOWN;
}

export function hasEntitlementExpired(entitlement: Entitlement): boolean {
  if (entitlement.consumed) {
    return true;
  }
  if (!entitlement.ends_at) {
    return false;
  }
  return new Date(entitlement.ends_at) < new Date();
}

export async function updateEntitlementsToGame(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>
): Promise<void> {
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
  } catch (error: unknown) {
    console.error(error);
  }
}

export async function fetchEntitlementsFromApi(
  userId: string,
  withoutExpired = false,
  guildId: string | null | undefined,
  skuIds?: string[]
): Promise<Entitlement[]> {
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
    return data;
  } catch (error: unknown) {
    return [];
  }
}

export function getRandomButtonStyle(): ButtonStyle {
  return (Math.floor(Math.random() * 4) + 1) as ButtonStyle;
}

export async function consumeEntitlement(entitlementId: string): Promise<boolean> {
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
  return true;
}

export function skuIdToCoins(skuId: string): number {
  switch (skuId) {
    case SMALL_POUCH_OF_COINS_SKU_ID:
      return 500;
    case GOLDEN_COIN_STASH_SKU_ID:
      return 5000;
    case LUCKY_COIN_BAG_SKU_ID:
      return 1500;
    case TREASURE_CHEST_OF_COINS_SKU_ID:
      return 3000;
    default:
      return 0;
  }
}

export class PremiumButtonBuilder extends OriginalButtonBuilder {
  private sku_id?: string;

  /**
   * Set the sku_id for the premium button.
   * @param {string} sku_id - The sku_id to set.
   * @returns {this}
   */
  public setSkuId(sku_id: string): this {
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
