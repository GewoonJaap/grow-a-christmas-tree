import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { getRandomElement } from "../util/helpers/arrayHelper";
import { MessageUpsellType } from "../util/types/MessageUpsellType";
import { toFixed } from "../util/helpers/numberHelper";
import { disposeActiveTimeouts } from "./Tree";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { PremiumButtonBuilder, SKU } from "../util/discord/DiscordApiExtensions";
import { safeEdit, safeReply } from "../util/discord/MessageExtenstions";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { Metrics } from "../tracing/metrics";
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const logger = pino({
  level: "info"
});
const BASE_COST = 100;
const COST_INCREMENT = 50;
const MAX_LEVEL = 100;
const MAX_BOOST = 100; // 100% boost at max level
const MAX_GROWTH_AMOUNT = 5; // 5ft growth at max level

const composterImages = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/composter/composter-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/composter/composter-2.jpg"
];

export class Composter implements ISlashCommand {
  public builder = new SlashCommandBuilder("composter", "View and upgrade Santa's Magic Composter.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("ComposterCommandHandler", async (span) => {
      try {
        if (
          UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
          (await BanHelper.isUserBanned(ctx.user.id))
        ) {
          const result = await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        }
        const result = await safeReply(ctx, await buildComposterMessage(ctx));
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
  };

  public components = [
    new Button(
      "composter.upgrade.efficiency",
      new ButtonBuilder().setEmoji({ name: "🧝" }).setStyle(1).setLabel("Elf-Powered Efficiency"),
      async (ctx: ButtonContext): Promise<void> => {
        const tracer = trace.getTracer("grow-a-tree");
        return tracer.startActiveSpan("ComposterUpgradeEfficiencyButtonHandler", async (span) => {
          try {
            if (
              UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
              (await BanHelper.isUserBanned(ctx.user.id))
            ) {
              const result = await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
              transitionBackToDefaultComposterViewWithTimeout(ctx);
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            }
            const result = await safeReply(ctx, await handleUpgrade(ctx, "efficiency"));
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
    ),
    new Button(
      "composter.upgrade.quality",
      new ButtonBuilder().setEmoji({ name: "✨" }).setStyle(1).setLabel("Sparkling Spirit"),
      async (ctx: ButtonContext): Promise<void> => {
        const tracer = trace.getTracer("grow-a-tree");
        return tracer.startActiveSpan("ComposterUpgradeQualityButtonHandler", async (span) => {
          try {
            if (
              UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
              (await BanHelper.isUserBanned(ctx.user.id))
            ) {
              const result = await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            }
            const result = await safeReply(ctx, await handleUpgrade(ctx, "quality"));
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
    ),
    new Button(
      "composter.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        const tracer = trace.getTracer("grow-a-tree");
        return tracer.startActiveSpan("ComposterRefreshButtonHandler", async (span) => {
          try {
            if (
              UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
              (await BanHelper.isUserBanned(ctx.user.id))
            ) {
              const result = await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            }
            const result = await safeReply(ctx, await buildComposterMessage(ctx));
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
    )
  ];
}

function upsellText(hasPremium: boolean): MessageUpsellType {
  const random = Math.random();
  if (hasPremium) {
    return {
      message:
        "✨ With the Festive Forest subscription, Santa's Magic Composter gives you an extra 10% boost to growth chance and growth amount. Enjoy the magic of the season!",
      isUpsell: false
    };
  }
  if (random > 0.5 && !hasPremium) {
    return {
      message:
        "🎄 Did you know? With the Festive Forest subscription, Santa's Magic Composter works even more magically! Unlock the full potential of your tree!",
      isUpsell: true,
      buttonSku: SKU.FESTIVE_ENTITLEMENT
    };
  }
  return {
    message: "🎅 Let Santa's elves and festive magic boost your tree's growth.",
    isUpsell: false
  };
}

async function buildComposterMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildComposterMessage", async (span) => {
    try {
      const festiveMessage = SpecialDayHelper.getFestiveMessage();
      if (!ctx.game) {
        const result = new MessageBuilder().addEmbed(
          new EmbedBuilder()
            .setTitle("Santa's Magic Composter")
            .setDescription("You need to plant a tree first before you can upgrade the composter.")
            .setColor(0xff0000)
            .setImage(getRandomElement(composterImages) ?? "")
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      }

      if (ctx.isDM) {
        const result = new MessageBuilder().addEmbed(
          new EmbedBuilder()
            .setTitle("Santa's Magic Composter")
            .setDescription("You can only upgrade the composter in a server.")
            .setColor(0xff0000)
            .setImage(getRandomElement(composterImages) ?? "")
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      }

      const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
      const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

      // Format upgrade costs or show "MAXED OUT" when reaching max level
      const efficiencyUpgradeCost =
        efficiencyLevel >= MAX_LEVEL ? "✨ MAXED OUT ✨" : `${BASE_COST + efficiencyLevel * COST_INCREMENT} coins`;

      const qualityUpgradeCost =
        qualityLevel >= MAX_LEVEL ? "✨ MAXED OUT ✨" : `${BASE_COST + qualityLevel * COST_INCREMENT} coins`;

      const growthChance = calculateGrowthChance(efficiencyLevel, ctx.game?.hasAiAccess ?? false);
      const growthAmount = calculateGrowthAmount(qualityLevel, ctx.game?.hasAiAccess ?? false);
      const upsellData = upsellText(ctx.game.hasAiAccess ?? false);

      // Create enchanted descriptions for maxed out levels
      const efficiencyLevelText =
        efficiencyLevel >= MAX_LEVEL ? `${efficiencyLevel} 🎄 (FULLY ENCHANTED)` : efficiencyLevel.toString();

      const qualityLevelText =
        qualityLevel >= MAX_LEVEL ? `${qualityLevel} 🎄 (FULLY ENCHANTED)` : qualityLevel.toString();

      const embed = new EmbedBuilder()
        .setTitle("Santa's Magic Composter")
        .setDescription(
          `Upgrade the composter to make your tree grow faster!\n\n` +
            `🧝 **Elf-Powered Efficiency:** Increases the chance that Santa's workshop elves give your tree an extra magical boost!\n` +
            `🧝 **Current Efficiency Level:** ${efficiencyLevelText}\n` +
            `🪙 **Efficiency Upgrade Cost:** ${efficiencyUpgradeCost}\n\n` +
            `✨ **Sparkling Spirit:** Enhances the growth boost your tree receives each time you water it!\n` +
            `✨ **Current Quality Level:** ${qualityLevelText}\n` +
            `🪙 **Quality Upgrade Cost:** ${qualityUpgradeCost}\n\n` +
            `**Extra Growth Chance:** ${growthChance}%\n` +
            `**Growth Amount:** ${growthAmount}ft`
        )
        .setImage(getRandomElement(composterImages) ?? "")
        .setColor(0x2e8b57) // Forest green color for more festivity
        .setFooter({ text: upsellData.message });

      if (festiveMessage.isPresent) {
        embed.setFooter({ text: festiveMessage.message });
      }

      const actionRow = new ActionRowBuilder();

      if (upsellData.isUpsell && upsellData.buttonSku && !process.env.DEV_MODE) {
        actionRow.addComponents(new PremiumButtonBuilder().setSkuId(upsellData.buttonSku));
      }

      if (efficiencyLevel < MAX_LEVEL) {
        actionRow.addComponents(await ctx.manager.components.createInstance("composter.upgrade.efficiency"));
      }

      if (qualityLevel < MAX_LEVEL) {
        actionRow.addComponents(await ctx.manager.components.createInstance("composter.upgrade.quality"));
      }

      // Add a celebration message if both upgrades are maxed out
      if (efficiencyLevel >= MAX_LEVEL && qualityLevel >= MAX_LEVEL) {
        embed.setDescription(
          embed.data.description +
            "\n\n🎉 **CONGRATULATIONS!** 🎉\n" +
            "Your composter has reached maximum enchantment! Santa's workshop elves cheer for your dedication!"
        );
      }

      actionRow.addComponents(await ctx.manager.components.createInstance("composter.refresh"));

      const result = new MessageBuilder().addEmbed(embed).addComponents(actionRow);
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

async function handleUpgrade(ctx: ButtonContext, upgradeType: "efficiency" | "quality"): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("handleUpgrade", async (span) => {
    try {
      if (!ctx.game) {
        const result = new MessageBuilder().addEmbed(
          new EmbedBuilder()
            .setTitle("Santa's Magic Composter")
            .setDescription("You need to plant a tree first before you can upgrade the composter.")
            .setColor(0xff0000)
            .setImage(getRandomElement(composterImages) ?? "")
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      }

      if (ctx.isDM) {
        const result = new MessageBuilder().addEmbed(
          new EmbedBuilder()
            .setTitle("Santa's Magic Composter")
            .setColor(0xff0000)
            .setImage(getRandomElement(composterImages) ?? "")
            .setDescription("You can only upgrade the composter in a server.")
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      }

      const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
      const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

      const upgradeCost =
        upgradeType === "efficiency"
          ? BASE_COST + efficiencyLevel * COST_INCREMENT
          : BASE_COST + qualityLevel * COST_INCREMENT;

      const wallet = await WalletHelper.getWallet(ctx.user.id);

      if (wallet.coins < upgradeCost) {
        const coinUpsellData = coinUpsell(upgradeCost);
        const embed = new EmbedBuilder()
          .setTitle("Upgrade Failed")
          .setDescription(`You need ${upgradeCost} coins to upgrade the composter.`)
          .setImage(getRandomElement(composterImages) ?? "")
          .setColor(0xff0000)
          .setFooter({ text: coinUpsellData.message });

        const actions = new ActionRowBuilder().addComponents(
          await ctx.manager.components.createInstance("composter.refresh")
        );

        if (coinUpsellData.isUpsell && coinUpsellData.buttonSku && !process.env.DEV_MODE) {
          actions.addComponents(new PremiumButtonBuilder().setSkuId(coinUpsellData.buttonSku));
        }

        Metrics.recordComposterUpgradeMetric(
          ctx.user.id,
          ctx.game.id,
          upgradeType,
          upgradeType === "efficiency" ? efficiencyLevel : qualityLevel
        );

        const message = new MessageBuilder().addEmbed(embed).addComponents(actions);

        transitionBackToDefaultComposterViewWithTimeout(ctx);

        span.setStatus({ code: SpanStatusCode.OK });
        return message;
      }

      await WalletHelper.removeCoins(ctx.user.id, upgradeCost);

      if (upgradeType === "efficiency") {
        ctx.game.composter.efficiencyLevel++;
      } else {
        ctx.game.composter.qualityLevel++;
      }

      await ctx.game.save();

      const result = await buildComposterMessage(ctx);
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

function transitionBackToDefaultComposterViewWithTimeout(ctx: ButtonContext, delay = 4000): void {
  disposeActiveTimeouts(ctx);
  ctx.timeouts.set(
    ctx.interaction.message.id,
    setTimeout(async () => {
      const tracer = trace.getTracer("grow-a-tree");
      return tracer.startActiveSpan("transitionBackToDefaultComposterViewWithTimeout", async (span) => {
        try {
          disposeActiveTimeouts(ctx);

          await safeEdit(ctx, await buildComposterMessage(ctx));
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (e) {
          logger.info(e);
          span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message });
          span.recordException(e as Error);
        } finally {
          span.end();
        }
      });
    }, delay)
  );
}

function coinUpsell(upgradeCost: number): MessageUpsellType {
  const needMoreCoins =
    "🎅 Need more coins? Play minigames after watering, claim your daily reward or purchase more coins in the store";
  if (upgradeCost <= 500) {
    return {
      message: needMoreCoins,
      isUpsell: true,
      buttonSku: SKU.SMALL_POUCH_OF_COINS
    };
  } else if (upgradeCost <= 1500) {
    return {
      message: needMoreCoins,
      isUpsell: true,
      buttonSku: SKU.LUCKY_COIN_BAG
    };
  } else if (upgradeCost <= 3000) {
    return {
      message: needMoreCoins,
      isUpsell: true,
      buttonSku: SKU.TREASURE_CHEST_OF_COINS
    };
  } else {
    return {
      message: needMoreCoins,
      isUpsell: true,
      buttonSku: SKU.GOLDEN_COIN_STASH
    };
  }
}

export function calculateGrowthChance(level: number, hasAiAccess: boolean): number {
  const baseChance = hasAiAccess ? 1.1 : 1; // Premium users get a 10% boost
  return toFixed(Math.min(MAX_BOOST, (level / MAX_LEVEL) * MAX_BOOST * baseChance), 1);
}

export function calculateGrowthAmount(level: number, hasAiAccess: boolean): number {
  const baseAmount = hasAiAccess ? 1.1 : 1; // Premium users get a 10% boost
  return toFixed(Math.min(MAX_GROWTH_AMOUNT, (level / MAX_LEVEL) * MAX_GROWTH_AMOUNT * baseAmount), 1);
}
