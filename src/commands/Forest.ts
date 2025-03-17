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
import { Guild, IGuild } from "../models/Guild";
import { CHEATER_CLOWN_EMOJI } from "../util/const";
import { UNLEASH_FEATURES, UnleashHelper } from "../util/unleash/UnleashHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import RedisClient from "../util/redisClient";
import { TreeUtils } from "../util/tree/TreeUtils";

type LeaderboardButtonState = {
  page: number;
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
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.last",
      new ButtonBuilder().setEmoji({ name: "⏭️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        const amountOfTrees = await getCachedTreeCount();
        const maxPages = Math.ceil(amountOfTrees / 10);
        ctx.state.page = maxPages;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.my_tree",
      new ButtonBuilder().setEmoji({ name: "📍" }).setStyle(1),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.game) {
          return await safeReply(
            ctx,
            SimpleError("You don't have a tree in this server yet. Try watering the tree first!")
          );
        }

        // Find the position of the user's tree
        const treePosition = await TreeUtils.findTreePosition(ctx);

        if (treePosition === -1) {
          return await safeReply(ctx, SimpleError("Couldn't find your tree in the forest. Try refreshing!"));
        }

        // Calculate which page the tree is on (10 trees per page)
        const treePage = Math.floor(treePosition / 10) + 1;

        if (!ctx.state) {
          ctx.state = { page: treePage };
        } else {
          ctx.state.page = treePage;
        }

        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    )
  ];
}

async function buildLeaderboardMessage(
  ctx: SlashCommandContext | ButtonContext<LeaderboardButtonState>
): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildLeaderboardMessage", async (span) => {
    try {
      const cheaterClownEnabled = UnleashHelper.isEnabled(UNLEASH_FEATURES.showCheaterClown, ctx);
      const state: LeaderboardButtonState =
        ctx instanceof SlashCommandContext
          ? { page: ctx.options.has("page") ? Number(ctx.options.get("page")?.value) : 1 }
          : (ctx.state as LeaderboardButtonState);

      const amountOfTrees = await getCachedTreeCount();

      let description = `🌲 **FESTIVE FOREST** 🌲\n*A magical forest of ${amountOfTrees} sparkling Christmas trees*\n\n`;

      const start = (state.page - 1) * 10;

      const trees = await getCachedTrees(start);

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
        const isOwnTree = ctx.game?.id == tree.id;

        const treeName = `${tree.name}`;
        const premiumText = `${tree.hasAiAccess ? " | " + premiumEmoji : ""}`;
        const treeSize = `${tree.size}ft`;
        const hasCheaters = cheaterClownEnabled && tree.isCheating;

        const treeIndicator = isOwnTree ? "📍 " : "";

        description += `${pos < 3 ? MEDAL_EMOJIS[i] : `${pos + 1}${pos < 9 ? " " : ""}`} - ${
          hasCheaters ? CHEATER_CLOWN_EMOJI : ""
        }${isOwnTree ? `**${treeName}**` : treeName} - ${treeSize}${premiumText}${treeIndicator}\n`;
      }

      // First row of navigation buttons
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("forest.refresh", state),
        await ctx.manager.components.createInstance("forest.my_tree", state)
      );

      // Second row of pagination buttons
      const paginationRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("forest.first", state)
      );

      if (state.page > 1) {
        paginationRow.addComponents(await ctx.manager.components.createInstance("forest.back", state));
      }

      if (trees.length > 10) {
        paginationRow.addComponents(await ctx.manager.components.createInstance("forest.next", state));
      }

      paginationRow.addComponents(await ctx.manager.components.createInstance("forest.last", state));

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder().setTitle("❄️ The Enchanted Forest ❄️").setDescription(description).setFooter({
            text: footerText
          })
        )
        .addComponents(actionRow, paginationRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function getCachedTreeCount(): Promise<number> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getCachedTreeCount", async (span) => {
    try {
      const redisClient = RedisClient.getInstance().getClient();
      const cacheKey = "treeCount";
      const cachedCount = await redisClient.get(cacheKey);

      if (cachedCount) {
        span.setStatus({ code: SpanStatusCode.OK });
        return parseInt(cachedCount, 10);
      }

      const count = await Guild.estimatedDocumentCount();
      await redisClient.setEx(cacheKey, 60, count.toString());

      span.setStatus({ code: SpanStatusCode.OK });
      return count;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

async function getCachedTrees(start: number): Promise<IGuild[]> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("getCachedTrees", async (span) => {
    try {
      const redisClient = RedisClient.getInstance().getClient();
      const cacheKey = `trees:${start}`;
      const cachedTrees = await redisClient.get(cacheKey);

      if (cachedTrees) {
        span.setStatus({ code: SpanStatusCode.OK });
        return JSON.parse(cachedTrees);
      }

      const trees = await Guild.find({}, { name: 1, size: 1, hasAiAccess: 1, isCheating: 1, id: 1 })
        .sort({ size: -1 })
        .skip(start)
        .limit(11)
        .lean();

      await redisClient.setEx(cacheKey, 60, JSON.stringify(trees));

      span.setStatus({ code: SpanStatusCode.OK });
      return trees;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
