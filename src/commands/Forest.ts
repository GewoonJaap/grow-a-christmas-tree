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
    return await ctx.reply(await buildLeaderboardMessage(ctx));
  };

  public components = [
    new Button(
      "forest.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return await ctx.reply(await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "forest.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return await ctx.reply(await buildLeaderboardMessage(ctx));
      }
    )
  ];
}

async function buildLeaderboardMessage(
  ctx: SlashCommandContext | ButtonContext<LeaderboardButtonState>
): Promise<MessageBuilder> {
  const state: LeaderboardButtonState =
    ctx instanceof SlashCommandContext
      ? { page: ctx.options.has("page") ? Number(ctx.options.get("page")?.value) : 1 }
      : (ctx.state as LeaderboardButtonState);

  const amountOfTrees = await Guild.countDocuments();

  let description = `*Christmas Tree forest with ${amountOfTrees} trees*\n\n`;

  const start = (state.page - 1) * 10;

  const trees = await Guild.find().sort({ size: -1 }).skip(start).limit(11);

  if (trees.length === 0) return SimpleError("This page is empty.");

  for (let i = 0; i < 10; i++) {
    if (i === trees.length) break;
    const pos = i + start;

    const tree = trees[i];
    const isOwnTree = ctx.game?.id === tree.id;
    const treeName = `${tree.name}`;
    const premiumText = `${tree.hasAiAccess ? " | " + PREMIUM_EMOJI : ""}`;
    const treeSize = `${tree.size}ft`;
    const bannedContributors = await BanHelper.areUsersBanned(tree.contributors.map((c) => c.userId));
    const hasCheaters = tree.isCheating || bannedContributors.length > 0;

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

  return new MessageBuilder()
    .addEmbed(
      new EmbedBuilder().setTitle("Forest").setDescription(description).setFooter({
        text: "🌟 = Premium tree. If you like the bot, consider supporting us by visting the shop, found when clicking the bot avatar."
      })
    )
    .addComponents(actionRow);
}
