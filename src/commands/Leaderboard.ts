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
import { WalletHelper } from "../util/wallet/WalletHelper";
import { BanHelper } from "../util/bans/BanHelper";
import { CHEATER_CLOWN_EMOJI } from "../util/const";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const builder = new SlashCommandBuilder(
  "leaderboard",
  "See a leaderboard of contributors to this server's christmas tree."
).addIntegerOption(
  new SlashCommandIntegerOption("page", "Leaderboard page to display.").setMinValue(1).setMaxValue(10)
);
builder.setDMEnabled(false);

type LeaderboardButtonState = {
  page: number;
};

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];

export class Leaderboard implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.game === null)
      return await safeReply(ctx, SimpleError("Use /plant to plant a christmas tree for your server first."));

    return await safeReply(ctx, await buildLeaderboardMessage(ctx));
  };

  public components = [
    new Button(
      "leaderboard.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state?.page) {
          ctx.state = { page: 1 };
        }

        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.first",
      new ButtonBuilder().setEmoji({ name: "⏮️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page = 1;
        return await safeReply(ctx, await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.last",
      new ButtonBuilder().setEmoji({ name: "⏭️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        const contributors = ctx.game?.contributors.length ?? 0;
        const maxPages = Math.ceil(contributors / 10);
        ctx.state.page = maxPages;
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
      if (ctx.game === null) {
        return SimpleError("Use /plant to plant a christmas tree for your server first.");
      }

      if (ctx.isDM) {
        return SimpleError("This command can only be used in a server.");
      }

      const state: LeaderboardButtonState =
        ctx instanceof SlashCommandContext
          ? { page: ctx.options.has("page") ? Number(ctx.options.get("page")?.value) : 1 }
          : (ctx.state as LeaderboardButtonState);

      let description = `*These users have contributed the most towards watering \`\`${ctx.game.name}\`\`.*\n\n`;

      const contributors = ctx.game.contributors.sort((a, b) => b.count - a.count);

      if (contributors.length === 0) return SimpleError("This page is empty.");

      const start = (state.page - 1) * 10;
      const end = Math.min(start + 10, contributors.length);
      const maxPages = Math.ceil(contributors.length / 10);

      const festiveMessage = SpecialDayHelper.getFestiveMessage();

      // Get user IDs for the current page
      const userIds = contributors.slice(start, end).map((contributor) => contributor.userId);

      // Fetch wallets in a single batch
      const walletMap = await WalletHelper.getWallets(userIds);
      const bannedUserId = await BanHelper.areUsersBanned(userIds);
      const cheaterClownEnabled = UnleashHelper.isEnabled(UNLEASH_FEATURES.showCheaterClown, ctx);

      for (let i = start; i < end; i++) {
        const contributor = contributors[i];
        const wallet = walletMap.get(contributor.userId);
        const isBanned = cheaterClownEnabled && bannedUserId.includes(contributor.userId);

        description += `${
          i < 3 ? `${MEDAL_EMOJIS[i]}${isBanned ? CHEATER_CLOWN_EMOJI : ""}` : `${i + 1}${i < 9 ? " " : ""}`
        } - 💧${contributor.count} - 🪙 ${wallet?.coins ?? 0} - 🔥${wallet?.streak ?? 0} <@${contributor.userId}>\n`;
      }
      if (festiveMessage.isPresent) {
        description += `\n${festiveMessage.message}`;
      }

      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("leaderboard.refresh", state)
      );

      if (state.page > 1) {
        actionRow.addComponents(await ctx.manager.components.createInstance("leaderboard.back", state));
      }

      if (state.page < maxPages) {
        actionRow.addComponents(await ctx.manager.components.createInstance("leaderboard.next", state));
      }

      actionRow.addComponents(await ctx.manager.components.createInstance("leaderboard.first", state));
      actionRow.addComponents(await ctx.manager.components.createInstance("leaderboard.last", state));

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("Leaderboard")
            .setDescription(description)
            .setFooter({
              text: `Page ${state.page}/${maxPages} | ${
                ctx.game.hasAiAccess ? "" : "Premium servers earn extra coins, have access to more minigames, and more!"
              }`
            })
        )
        .addComponents(actionRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
