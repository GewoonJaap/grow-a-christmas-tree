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
    if (ctx.game === null) return ctx.reply("Use /plant to plant a christmas tree for your server first.");

    return ctx.reply(await buildLeaderboardMessage(ctx));
  };

  public components = [
    new Button(
      "leaderboard.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state?.page) {
          ctx.state = { page: 1 };
        }

        return ctx.reply(await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return ctx.reply(await buildLeaderboardMessage(ctx));
      }
    ),
    new Button(
      "leaderboard.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2),
      async (ctx: ButtonContext<LeaderboardButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return ctx.reply(await buildLeaderboardMessage(ctx));
      }
    )
  ];
}

async function buildLeaderboardMessage(
  ctx: SlashCommandContext | ButtonContext<LeaderboardButtonState>
): Promise<MessageBuilder> {
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

  // Get user IDs for the current page
  const userIds = contributors.slice(start, end).map((contributor) => contributor.userId);

  // Fetch wallets in a single batch
  const walletMap = await WalletHelper.getWallets(userIds);

  for (let i = start; i < end; i++) {
    const contributor = contributors[i];
    const wallet = walletMap.get(contributor.userId);

    description += `${i < 3 ? `${MEDAL_EMOJIS[i]}` : `${i + 1}${i < 9 ? " " : ""}`} - 💧${contributor.count} - 🪙 ${
      wallet?.coins ?? 0
    } - 🔥${wallet?.streak ?? 0} <@${contributor.userId}>\n`;
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
}
