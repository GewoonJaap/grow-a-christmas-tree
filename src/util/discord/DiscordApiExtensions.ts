import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { Entitlement, EntitlementType } from "../types/discord/DiscordTypeExtension";
import { ButtonBuilder as OriginalButtonBuilder } from "interactions.ts";
import { ButtonStyle } from "discord-api-types/v10";

export function getEntitlements(ctx: SlashCommandContext | ButtonContext, withoutExpired = false): Entitlement[] {
  const interaction = ctx.interaction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entitlements: Entitlement[] = (interaction as any).entitlements;
  if (withoutExpired) {
    return entitlements.filter((entitlement) => !hasEntitlementExpired(entitlement));
  }
  return entitlements;
}

export function entitlementSkuResolver(skuId: string): EntitlementType {
  if (skuId === "1298016263687110697") {
    return EntitlementType.UNLIMITED_LEVELS;
  }
  if (skuId === "1298016263687110698" || skuId === "1298017583941029949") {
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

export async function updateEntitlementsToGame(ctx: SlashCommandContext | ButtonContext): Promise<void> {
  if (ctx.game == null) return;
  const entitlements = getEntitlements(ctx, true);

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
}

export class PremiumButtonBuilder extends OriginalButtonBuilder {
  private sku_id?: string;

  public setSkuId(sku_id: string): this {
    this.sku_id = sku_id;
    return this;
  }

  public setStyle(style: ButtonStyle): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.setStyle(style as any);
  }

  public toJSON() {
    const json = super.toJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.sku_id) (json as unknown as any).sku_id = this.sku_id;
    return json;
  }
}
