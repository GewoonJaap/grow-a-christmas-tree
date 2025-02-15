import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  Button,
  ButtonBuilder,
  ButtonContext,
  ActionRowBuilder
} from "interactions.ts";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { AdventCalendarHelper, WonPresent } from "../util/adventCalendar/AdventCalendarHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { getRandomElement } from "../util/helpers/arrayHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { Metrics } from "../tracing/metrics"; // Import Metrics
import { trace, SpanStatusCode } from "@opentelemetry/api";

const CHRISTMAS_DAY_IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/advent-calendar/christmas-day/advent-calendar-christmasday-1.jpg"
];

export class AdventCalendar implements ISlashCommand {
  public builder = new SlashCommandBuilder(
    "adventcalendar",
    "🎅 Unwrap your daily gift from Santa's Advent Calendar! 🎁"
  );

  public handler = async (ctx: SlashCommandContext | ButtonContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("AdventCalendarCommandHandler", async (span) => {
      try {
        const result = await safeReply(ctx, await buildAdventCalendarMessage(ctx));
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
      "adventcalendar.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await buildAdventCalendarMessage(ctx));
      }
    )
  ];
}

async function buildAdventCalendarMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildAdventCalendarMessage", async (span) => {
    try {
      if (
        UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
        (await BanHelper.isUserBanned(ctx.user.id))
      ) {
        return BanHelper.getBanEmbed(ctx.user.username);
      }

      if (!ctx.game || ctx.isDM) {
        return new MessageBuilder().setContent("This command can only be used in a server with a tree planted.");
      }

      const userId = ctx.user.id;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const endOfAdvent = new Date(currentYear, 11, 25, 23, 59, 59); // December 25th

      if (!AdventCalendarHelper.isAdventCalendarActive()) {
        const nextChristmas =
          currentDate > endOfAdvent ? new Date(currentYear + 1, 11, 1) : new Date(currentYear, 11, 1); // December 1st of next year if after December 25th, otherwise this year
        return await buildAdventCalendarUnavailableMessage(ctx, nextChristmas);
      }

      const hasOpenedPresent = await AdventCalendarHelper.hasClaimedToday(userId);

      if (hasOpenedPresent) {
        const nextOpenDate = AdventCalendarHelper.getNextClaimDay(
          (await AdventCalendarHelper.getLastClaimDay(userId)) ?? new Date()
        );
        return await buildAlreadyOpenedMessage(ctx, nextOpenDate);
      }

      const present = await AdventCalendarHelper.addClaimedDay(ctx);

      if (!present) {
        return new MessageBuilder().setContent("An error occurred while opening your present. Please try again later.");
      }

      // Log user ID and reward details when a present is opened
      Metrics.recordAdventCalendarWinMetric(userId, present.displayText);

      span.setStatus({ code: SpanStatusCode.OK });
      return buildPresentOpenedMessage(ctx, present);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function buildAdventCalendarUnavailableMessage(
  ctx: SlashCommandContext | ButtonContext,
  nextChristmas: Date
): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildAdventCalendarUnavailableMessage", async (span) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle("🎁 Santa's Advent Calendar 🎄")
        .setDescription(
          `🎄 The advent calendar is only available from December 1st until Christmas. Please come back on December 1st. 🎅\n\nNext advent calendar starts in <t:${Math.floor(
            nextChristmas.getTime() / 1000
          )}:R>.`
        )
        .setColor(0xff0000)
        .setImage(getImageUrl());

      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("adventcalendar.refresh")
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function buildAlreadyOpenedMessage(
  ctx: SlashCommandContext | ButtonContext,
  nextOpenDate: Date
): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildAlreadyOpenedMessage", async (span) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle("🎁 Santa's Advent Calendar 🎄")
        .setDescription(
          `🎁 <@${
            ctx.user.id
          }>, You've already unwrapped today's gift! Come back tomorrow to open the next one. 🎁 <t:${Math.floor(
            nextOpenDate.getTime() / 1000
          )}:R>.`
        )
        .setColor(0xff0000)
        .setImage(getImageUrl());

      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("adventcalendar.refresh")
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

function getImageUrl(): string {
  return SpecialDayHelper.isChristmas()
    ? getRandomElement(CHRISTMAS_DAY_IMAGES) ?? CHRISTMAS_DAY_IMAGES[0]
    : "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/advent-calendar/advent-calendar-1.jpg";
}

async function buildPresentOpenedMessage(
  ctx: SlashCommandContext | ButtonContext,
  present: WonPresent
): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildPresentOpenedMessage", async (span) => {
    try {
      const festiveMessage = SpecialDayHelper.getFestiveMessage();
      const embed = new EmbedBuilder()
        .setTitle("🎁 Santa's Advent Calendar 🎄")
        .setDescription(
          `🎉 <@${ctx.user.id}>, You've unwrapped your advent calendar gift and received **${present.displayText}**! Check back tomorrow for more festive surprises. 🎄`
        )
        .setColor(0x00ff00)
        .setImage(getImageUrl());

      if (SpecialDayHelper.isChristmas()) {
        embed.setDescription(
          `🎁 <@${ctx.user.id}>, you've unwrapped your special advent calendar gift and received **${present.displayText}**! 🎄✨\n\n🎅 Wishing you a magical and Merry Christmas! 🎅`
        );
        embed.setFooter({ text: "We wish you a Merry Christmas!🎅" });
      } else if (festiveMessage.isPresent) {
        embed.setFooter({ text: festiveMessage.message });
      }

      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("adventcalendar.refresh")
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
