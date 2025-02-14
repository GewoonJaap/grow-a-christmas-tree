import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { calculateTreeTierImage, getCurrentTreeTier } from "../util/tree-tier-calculator";
import { getTreeAge, getWateringInterval } from "../util/watering-inteval";
import humanizeDuration = require("humanize-duration");
import { updateEntitlementsToGame } from "../util/discord/DiscordApiExtensions";
import { minigameButtons, startPenaltyMinigame, startRandomMinigame } from "../minigames/MinigameFactory";
import { sendAndDeleteWebhookMessage } from "../util/TreeWateringNotification";
import { calculateGrowthChance, calculateGrowthAmount } from "./Composter";
import { toFixed } from "../util/helpers/numberHelper";
import { WateringEvent } from "../models/WateringEvent";
import { saveFailedAttempt } from "../util/anti-bot/failedAttemptsHelper";
import { isUserFlagged } from "../util/anti-bot/flaggingHelper";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { getLocaleFromTimezone } from "../util/timezones";
import { NewsMessageHelper } from "../util/news/NewsMessageHelper";
import { BoosterHelper } from "../util/booster/BoosterHelper";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";
import { Metrics } from "../tracing/metrics";
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { AchievementHelper } from "../util/achievement/AchievementHelper";

const logger = pino({
  level: "info"
});

const MINIGAME_CHANCE = 0.4;
const MINIGAME_DELAY_SECONDS = 5 * 60;

const builder = new SlashCommandBuilder("tree", "Display your server's tree.");

builder.setDMEnabled(false);

export class Tree implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("TreeCommandHandler", async (span) => {
      try {
        disposeActiveTimeouts(ctx);
        if (ctx.isDM)
          return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
        if (ctx.game === null || !ctx.game)
          return await safeReply(
            ctx,
            new MessageBuilder().setContent("You don't have a christmas tree planted in this server.")
          );

        if (
          UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
          (await BanHelper.isUserBanned(ctx.user.id))
        ) {
          return await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
        }

        const result = await safeReply(ctx, await buildTreeDisplayMessage(ctx));
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
      "tree.grow",
      new ButtonBuilder().setEmoji({ name: "💧" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        disposeActiveTimeouts(ctx);
        await handleTreeGrow(ctx);
      }
    ),
    new Button(
      "tree.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        disposeActiveTimeouts(ctx);
        if (
          UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
          (await BanHelper.isUserBanned(ctx.user.id))
        ) {
          safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
          await updateEntitlementsToGame(ctx);
          transitionToDefaultTreeView(ctx);
          return;
        }
        await safeReply(ctx, await buildTreeDisplayMessage(ctx));
        await updateEntitlementsToGame(ctx);
        return;
      }
    ),
    ...minigameButtons
  ];
}

async function handleTreeGrow(ctx: ButtonContext): Promise<void> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("handleTreeGrow", async (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");
      if (
        UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
        (await BanHelper.isUserBanned(ctx.user.id))
      ) {
        await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
        transitionToDefaultTreeView(ctx);
        return;
      }

      if (ctx.game.lastWateredBy === ctx.user.id && process.env.DEV_MODE !== "true") {
        disposeActiveTimeouts(ctx);
        await logFailedWateringAttempt(ctx, "user watered last");
        if (await isUserFlagged(ctx)) {
          const penaltyMinigameStarted = await startPenaltyMinigame(ctx);
          if (penaltyMinigameStarted) return;
        }
        const actions = new ActionRowBuilder().addComponents(
          await ctx.manager.components.createInstance("tree.refresh")
        );
        await safeReply(
          ctx,
          SimpleError("You watered this tree last, you must let someone else water it first.")
            .setEphemeral(true)
            .addComponents(actions)
        );

        transitionToDefaultTreeView(ctx);
        return;
      }

      if (SpecialDayHelper.isValentinesDay()) {
        await AchievementHelper.grantAchievement(ctx.user.id, "Cupid's Arrow");
      }

      const wateringInterval = getWateringInterval(ctx, ctx.game.size, ctx.game.superThirsty ?? false),
        time = Math.floor(Date.now() / 1000);
      if (ctx.game.lastWateredAt + wateringInterval > time && process.env.DEV_MODE !== "true") {
        disposeActiveTimeouts(ctx);
        await logFailedWateringAttempt(ctx, "tree not ready");
        if (await isUserFlagged(ctx)) {
          const penaltyMinigameStarted = await startPenaltyMinigame(ctx);
          if (penaltyMinigameStarted) return;
        }

        const actions = new ActionRowBuilder().addComponents(
          await ctx.manager.components.createInstance("tree.refresh")
        );
        await safeReply(
          ctx,
          new MessageBuilder()
            .addEmbed(
              new EmbedBuilder()
                .setTitle(`\`\`${ctx.game.name}\`\` is growing already.`)
                .setDescription(
                  `It was recently watered by <@${ctx.game.lastWateredBy}>.\n\nYou can next water it: <t:${
                    ctx.game.lastWateredAt + wateringInterval
                  }:R>`
                )
            )
            .addComponents(actions)
        );

        transitionToDefaultTreeView(ctx);
        return;
      }

      ctx.game.lastWateredAt = time;
      ctx.game.lastWateredBy = ctx.user.id;

      applyGrowthBoost(ctx);

      const contributor = ctx.game.contributors.find((contributor) => contributor.userId === ctx.user.id);

      if (contributor) {
        contributor.count++;
        contributor.lastWateredAt = time;
      } else {
        ctx.game.contributors.push({ userId: ctx.user.id, count: 1, lastWateredAt: time });
      }

      await logWateringEvent(ctx);

      await ctx.game.save();

      if (await isUserFlagged(ctx)) {
        const penaltyMinigameStarted = await startPenaltyMinigame(ctx);
        if (penaltyMinigameStarted) return;
      }

      if (shouldStartMinigame(ctx)) {
        ctx.game.lastEventAt = Math.floor(Date.now() / 1000);
        await ctx.game.save();
        const minigameStarted = await startRandomMinigame(ctx);
        if (minigameStarted) return;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      const replyResult = await safeReply(ctx, await buildTreeDisplayMessage(ctx));
      await updateEntitlementsToGame(ctx);
      return replyResult;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function logWateringEvent(ctx: ButtonContext): Promise<void> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("logWateringEvent", async (span) => {
    try {
      if (!ctx.game) return;
      Metrics.recordWateringEvent(ctx.user.id, ctx.game.id, false);
      const wateringEvent = new WateringEvent({
        userId: ctx.user.id,
        guildId: ctx.game.id,
        timestamp: new Date()
      });
      await wateringEvent.save();
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

function shouldStartMinigame(ctx: ButtonContext | SlashCommandContext | ButtonContext<unknown>): boolean {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("shouldStartMinigame", (span) => {
    try {
      if (!ctx.game) return false;
      const hasCooldownPassed = ctx.game.lastEventAt + MINIGAME_DELAY_SECONDS < Math.floor(Date.now() / 1000);
      const hasMinigameChance =
        BoosterHelper.shouldApplyBooster(ctx, "Minigame Booster") || Math.random() < MINIGAME_CHANCE;
      span.setStatus({ code: SpanStatusCode.OK });
      return process.env.DEV_MODE === "true" || (hasCooldownPassed && hasMinigameChance);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function logFailedWateringAttempt(ctx: ButtonContext, failureReason: string): Promise<void> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("logFailedWateringAttempt", async (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");
      Metrics.recordWateringEvent(ctx.user.id, ctx.game.id, true, failureReason);
      await saveFailedAttempt(ctx, "watering", failureReason);
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

function applyGrowthBoost(ctx: ButtonContext): void {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("applyGrowthBoost", (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");
      const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
      const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;
      const growthChance = calculateGrowthChance(efficiencyLevel, ctx.game.hasAiAccess);
      const growthAmount = calculateGrowthAmount(qualityLevel, ctx.game.hasAiAccess);

      let growthToAdd = BoosterHelper.tryApplyBoosterEffectOnNumber(ctx, "Growth Booster", 1);
      if (Math.random() * 100 < growthChance) {
        growthToAdd += growthAmount;
      }
      ctx.game.size += growthToAdd;
      ctx.game.size = toFixed(ctx.game.size, 2);
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

export function disposeActiveTimeouts(
  ctx: ButtonContext | ButtonContext<never> | SlashCommandContext | ButtonContext<unknown>
): void {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("disposeActiveTimeouts", (span) => {
    try {
      const timeout = ctx.timeouts.get(ctx.interaction?.message?.id ?? "");
      if (timeout) clearTimeout(timeout);
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
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

export function transitionToDefaultTreeView(ctx: ButtonContext | ButtonContext<unknown>, delay = 4000) {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("transitionToDefaultTreeView", (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");
      disposeActiveTimeouts(ctx);
      ctx.timeouts.set(
        ctx.interaction.message.id,
        setTimeout(async () => {
          try {
            disposeActiveTimeouts(ctx);
            await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
            await updateEntitlementsToGame(ctx);
            span.setStatus({ code: SpanStatusCode.OK });
          } catch (e) {
            logger.error(e);
            try {
              await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
              await updateEntitlementsToGame(ctx);
            } catch (e) {
              logger.error(e);
            }
          }
        }, delay)
      );
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function buildTreeDisplayMessage(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>
): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildTreeDisplayMessage", async (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");

      const actionBuilder = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("tree.grow"),
        await ctx.manager.components.createInstance("tree.refresh")
      );
      const message = new MessageBuilder().addComponents(actionBuilder);

      const canBeWateredAt =
        ctx.game.lastWateredAt + getWateringInterval(ctx, ctx.game.size, ctx.game.superThirsty ?? false);

      const embed = new EmbedBuilder().setTitle(`${ctx.game.name} ${ctx.game.hasAiAccess ? "✨" : ""}`);
      const time = Math.floor(Date.now() / 1000);

      const treeImage = await calculateTreeTierImage(
        ctx.game.size,
        ctx.game.hasAiAccess ?? false,
        ctx.game.id,
        ctx.game.treeStyles ?? [],
        ctx.game.currentImageUrl
      );
      ctx.game.currentImageUrl = treeImage.image;
      await ctx.game.save();

      embed.setImage(treeImage.image);

      embed.setFooter({
        text: `Your christmas tree${ctx.game.hasAiAccess ? "✨" : ""} (lvl. ${getCurrentTreeTier(
          ctx.game.size,
          ctx.game.hasAiAccess
        )}) has spent ${humanizeDuration(
          ctx.game.lastWateredAt + getWateringInterval(ctx, ctx.game.size, ctx.game.superThirsty ?? false) < time
            ? getTreeAge(ctx, ctx.game.size) * 1000
            : (getTreeAge(ctx, ctx.game.size - 1) + time - ctx.game.lastWateredAt) * 1000
        )} growing. Nice!${getStyleMetadata(treeImage.metadata, treeImage.isLoadingNewImage ?? false)}`
      });

      if (canBeWateredAt < Date.now() / 1000) {
        embed.setDescription(
          `**Your tree is ${ctx.game.size}ft tall.**\n\nLast watered by: <@${
            ctx.game.lastWateredBy
          }>\n**Ready to be watered!**${
            (ctx.game.hasAiAccess ?? false) == false
              ? "\nEnjoy unlimited levels, fun minigames, watering notifications and more via the [shop](https://discord.com/application-directory/1050722873569968128/store)! Just click [here](https://discord.com/application-directory/1050722873569968128/store) or on the bot avatar to access the shop."
              : ""
          }\n${getActiveBoostersText(ctx)}\n${getNewsMessages()}`
        );
      } else {
        embed.setDescription(
          `**Your tree is ${ctx.game.size}ft tall.**\n\nLast watered by: <@${
            ctx.game.lastWateredBy
          }>\n**Your tree is growing**, come back <t:${canBeWateredAt}:R>.\nCan be watered at: **${new Date(
            canBeWateredAt * 1000
          ).toLocaleString(getLocaleFromTimezone(ctx.game.timeZone), { timeZone: ctx.game.timeZone })} **${
            (ctx.game.hasAiAccess ?? false) == false
              ? "\nEnjoy unlimited levels, fun minigames, watering notifications and more via the [shop](https://discord.com/application-directory/1050722873569968128/store)! Just click [here](https://discord.com/application-directory/1050722873569968128/store) or on the bot avatar to access the shop."
              : ""
          }\n${getActiveBoostersText(ctx)}\n${getNewsMessages()}`
        );

        if (ctx.interaction.message && !ctx.timeouts.has(ctx.interaction.message.id)) {
          const canBeWateredAtTimeoutTime = canBeWateredAt * 1000 - Date.now();
          setWateringReadyTimeout(ctx, canBeWateredAtTimeoutTime);
          ctx.timeouts.set(
            ctx.interaction.message.id,
            setTimeout(async () => {
              disposeActiveTimeouts(ctx);
              await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
            }, canBeWateredAtTimeoutTime)
          );
        }
      }

      message.addEmbed(embed);
      span.setStatus({ code: SpanStatusCode.OK });
      return message;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

function getStyleMetadata(metadata: Record<string, string> | undefined, isLoadingNewImage = false): string {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getStyleMetadata", (span) => {
    try {
      if (isLoadingNewImage) {
        span.setStatus({ code: SpanStatusCode.OK });
        return " | Loading new tree...";
      }
      if (!metadata || !metadata.styles) {
        span.setStatus({ code: SpanStatusCode.OK });
        return "";
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return ` | Style: ${metadata.styles}`;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

function getActiveBoostersText(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): string {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getActiveBoostersText", (span) => {
    try {
      const boosters = BoosterHelper.getActiveBoosters(ctx);
      if (ctx.game?.activeBoosters && boosters.length > 0) {
        const activeBoosters = boosters.map((booster) => {
          const remainingTime = booster.startTime + booster.duration - Math.floor(Date.now() / 1000);
          return `**${booster.type}** (${humanizeDuration(remainingTime * 1000)} remaining)`;
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return `**Active Boosters**:\n${activeBoosters.join("\n")}`;
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return "**Active Boosters**:\nNo active boosters";
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

function getNewsMessages(): string {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getNewsMessages", (span) => {
    try {
      const newsMessages = NewsMessageHelper.getMessages(1);
      span.setStatus({ code: SpanStatusCode.OK });
      return newsMessages.join("\n\n");
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

function removeWateringReadyTimeout(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): void {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("removeWateringReadyTimeout", (span) => {
    try {
      if (!ctx.game) return;
      const timeout = ctx.timeouts.get(ctx.game.id);
      if (timeout) clearTimeout(timeout);
      ctx.timeouts.delete(ctx.game.id);
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

function setWateringReadyTimeout(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
  timeoutTime: number
): void {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("setWateringReadyTimeout", (span) => {
    try {
      if (!ctx.game) return;
      removeWateringReadyTimeout(ctx);

      ctx.timeouts.set(
        ctx.game.id,
        setTimeout(async () => {
          removeWateringReadyTimeout(ctx);
          sendWebhookOnWateringReady(ctx);
        }, timeoutTime)
      );
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

async function sendWebhookOnWateringReady(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>) {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("sendWebhookOnWateringReady", async (span) => {
    try {
      if (
        ctx.game &&
        (ctx.game.hasAiAccess || process.env.DEV_MODE) &&
        ctx.game.notificationRoleId &&
        ctx.game.webhookId &&
        ctx.game.webhookToken
      ) {
        await sendAndDeleteWebhookMessage(
          ctx.game.webhookId,
          ctx.game.webhookToken,
          ctx.game.notificationRoleId,
          "The tree is ready to be watered! 🌲💧"
        );
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
