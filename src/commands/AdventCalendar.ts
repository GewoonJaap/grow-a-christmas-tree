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
import { AdventCalendarHelper } from "../util/adventCalendar/AdventCalendarHelper";

export class AdventCalendar implements ISlashCommand {
  public builder = new SlashCommandBuilder("adventcalendar", "Open your daily advent calendar present!");

  public handler = async (ctx: SlashCommandContext | ButtonContext): Promise<void> => {
    return await ctx.reply(await buildAdventCalendarMessage(ctx));
  };

  public components = [
    new Button(
      "adventcalendar.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildAdventCalendarMessage(ctx));
      }
    )
  ];
}

async function buildAdventCalendarMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
    return BanHelper.getBanEmbed(ctx.user.username);
  }

  if (!ctx.game || ctx.isDM) {
    return new MessageBuilder().setContent("This command can only be used in a server with a tree planted.");
  }

  const userId = ctx.user.id;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const startOfAdvent = new Date(currentYear, 11, 1); // December 1st
  const endOfAdvent = new Date(currentYear, 11, 25, 23, 59, 59); // December 25th

  if (currentDate < startOfAdvent || currentDate > endOfAdvent) {
    const nextChristmas = currentDate > endOfAdvent ? new Date(currentYear + 1, 11, 1) : new Date(currentYear, 11, 1); // December 1st of next year if after December 25th, otherwise this year
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

  return buildPresentOpenedMessage(ctx, present);
}

async function buildAdventCalendarUnavailableMessage(
  ctx: SlashCommandContext | ButtonContext,
  nextChristmas: Date
): Promise<MessageBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("Advent Calendar")
    .setDescription(
      `🎄 The advent calendar is only available from December 1st until Christmas. Please come back on December 1st. 🎅\n\nNext advent calendar starts in <t:${Math.floor(
        nextChristmas.getTime() / 1000
      )}:R>.`
    )
    .setColor(0xff0000)
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/advent-calendar/advent-calendar-1.jpg");

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("adventcalendar.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function buildAlreadyOpenedMessage(
  ctx: SlashCommandContext | ButtonContext,
  nextOpenDate: Date
): Promise<MessageBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("Advent Calendar")
    .setDescription(
      `🎁 <@${
        ctx.user.id
      }>, You have already opened your present for today. You can open your next present <t:${Math.floor(
        nextOpenDate.getTime() / 1000
      )}:R>.`
    )
    .setColor(0xff0000)
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/advent-calendar/advent-calendar-1.jpg");

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("adventcalendar.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function buildPresentOpenedMessage(
  ctx: SlashCommandContext | ButtonContext,
  present: { type: string; amount?: number }
): Promise<MessageBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("Advent Calendar")
    .setDescription(
      `🎉 <@${ctx.user.id}>, You have opened your advent calendar present and received ${present.amount} ${present.type}! Come back tomorrow for another present.`
    )
    .setColor(0x00ff00)
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/advent-calendar/advent-calendar-1.jpg");

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("adventcalendar.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}
