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
  SlashCommandContext,
  SlashCommandIntegerOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { BanHelper } from "../util/bans/BanHelper";
import { CHEATER_CLOWN_EMOJI } from "../util/const";
import { UNLEASH_FEATURES, UnleashHelper } from "../util/unleash/UnleashHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";

type LeaderboardButtonState = {
  page: number;
  cursor: number;
};

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];
const PREMIUM_EMOJI = "🌟";

export class Forest implements ISlashCommand {
  public builder = new SlashCommandBuilder("forest", "See the tallest trees in the whole forest.").addIntegerOption(
    new SlashCommandIntegerOption("page", "Leaderboard page to display.").setMinValue(1).setMaxValue(10)
  );

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("ForestCommandHandler", async (span) => {
      try {
        const result = await safeReply(ctx, await buildLeaderboardMessage(ctx));
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
      "forest.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.first",
      new ButtonBuilder().setEmoji({ name: "⏮️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page = 1;
        ctx.state.cursor = Number.MAX_SAFE_INTEGER;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.last",
      new ButtonBuilder().setEmoji({ name: "⏭️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        const amountOfTrees = await Guild.countDocuments();
        const maxPages = Math.ceil(amountOfTrees / 10);
        ctx.state.page = maxPages;
        ctx.state.cursor = 0;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    )
  ];
}

async function buildLeaderboardMessage(
  ctx: SlashCommandContext | ButtonContext<LeaderboardButtonState>
): Promise<MessageBuilder> {
  const cheaterClownEnabled = UnleashHelper.isEnabled(UNLEASH_FEATURES.showCheaterClown, ctx);
  const state: LeaderboardButtonState =
    ctx instanceof SlashCommandContext
      ? { page: ctx.options.has("page") ? Number(ctx.options.get("page")?.value) : 1, cursor: Number.MAX_SAFE_INTEGER }
      : (ctx.state as LeaderboardButtonState);

  const amountOfTrees = await Guild.countDocuments();

  let description = `*Christmas Tree forest with ${amountOfTrees} trees*\n\n`;

  const start = (state.page - 1) * 10;

  const trees = await Guild.find({ size: { $lt: state.cursor } })
    .sort({ size: -1 })
    .limit(11)
    .select("name size hasAiAccess isCheating contributors.userId");

  const premiumEmojiVariant = UnleashHelper.getVariant(UNLEASH_FEATURES.premiumServerEmoji, ctx);

  const premiumEmoji = premiumEmojiVariant.enabled
    ? premiumEmojiVariant.payload?.value ?? PREMIUM_EMOJI
    : PREMIUM_EMOJI;

  const footerText = premiumEmojiVariant.payload?.value
    ? "🌟 Trees with an emoji are enjoying premium! If you like the bot, consider supporting us by visting the shop, found when clicking the bot avatar."
    : "🌟 = Premium tree. If you like the bot, consider supporting us by visting the shop, found when clicking the bot avatar.";
  if (trees.length === 0) return SimpleError("This page is empty.");

  for (let i = 0; i < 10; i++) {
    if (i === trees.length) break;
    const pos = i + start;

    const tree = trees[i];
    const isOwnTree = ctx.game?.id === tree.id;
    const treeName = `${tree.name}`;
    const premiumText = `${tree.hasAiAccess ? " | " + premiumEmoji : ""}`;
    const treeSize = `${tree.size}ft`;
    const bannedContributors = await BanHelper.areUsersBanned(tree.contributors.map((c) => c.userId));
    const hasCheaters = cheaterClownEnabled && (tree.isCheating || bannedContributors.length > 0);

    description += `${pos < 3 ? MEDAL_EMOJIS[i] : `${pos + 1}${pos < 9 ? " " : ""}`} - ${
      hasCheaters ? CHEATER_CLOWN_EMOJI : ""
    }${isOwnTree ? `**${treeName}**` : treeName} - ${treeSize}${premiumText}\n`;
  }

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("forest.refresh", state)
  );

  if (state.page > 1) {
    actionRow.addComponents(await ctx.manager.components.createInstance("forest.back", state));
  }

  if (trees.length > 10) {
    actionRow.addComponents(await ctx.manager.components.createInstance("forest.next", state));
  }

  actionRow.addComponents(await ctx.manager.components.createInstance("forest.first", state));
  actionRow.addComponents(await ctx.manager.components.createInstance("forest.last", state));

  return new MessageBuilder()
    .addEmbed(
      new EmbedBuilder().setTitle("Forest").setDescription(description).setFooter({
        text: footerText
      })
    )
    .addComponents(actionRow);
}
