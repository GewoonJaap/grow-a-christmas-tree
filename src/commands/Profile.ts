import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandUserOption
} from "interactions.ts";
import { updateEntitlementsToGame } from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { BanHelper } from "../util/bans/BanHelper";
import { CHEATER_CLOWN_EMOJI } from "../util/const";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";

type State = {
  id: string;
  nick: string;
};

const builder = new SlashCommandBuilder("profile", "View a user's contributions to the christmas tree.").addUserOption(
  new SlashCommandUserOption("target", "User whose profile you want to view.")
);

builder.setDMEnabled(false);

export class Profile implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) return await ctx.reply("This command can only be used in a server.");
    await updateEntitlementsToGame(ctx);
    return await ctx.reply(await buildProfileMessage(ctx));
  };

  public components = [
    new Button(
      "profile.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(1),
      async (ctx: ButtonContext<State>): Promise<void> => {
        return await ctx.reply(await buildProfileMessage(ctx));
      }
    )
  ];
}

async function buildProfileMessage(ctx: SlashCommandContext | ButtonContext<State>): Promise<MessageBuilder> {
  if (!ctx.game) throw new Error("Game data missing.");

  let nick: string, id: string;

  if (ctx instanceof SlashCommandContext || !ctx.state) {
    const target =
      ctx instanceof SlashCommandContext && ctx.options.has("target")
        ? ctx.interaction.data.resolved?.users?.[ctx.options.get("target")?.value as string]
        : undefined;

    id = target ? target.id : ctx.user.id;
    nick =
      ctx instanceof SlashCommandContext && target
        ? ctx.interaction.data?.resolved?.members?.[id]?.nick ?? target.username
        : ctx.interaction.member?.nick ?? ctx.user.username;
  } else {
    id = ctx.state.id;
    nick = ctx.state.nick;
  }

  const contributor = ctx.game.contributors.find((contributor) => contributor.userId === id);
  const wallet = await WalletHelper.getWallet(id);
  const cheaterClownEnabled = UnleashHelper.isEnabled(UNLEASH_FEATURES.showCheaterClown, ctx);
  const isBanned = cheaterClownEnabled && (await BanHelper.isUserBanned(id));

  const contributorRank =
    ctx.game.contributors.sort((a, b) => b.count - a.count).findIndex((contributor) => contributor.userId === id) + 1;

  return new MessageBuilder()
    .addEmbed(
      new EmbedBuilder()
        .setTitle(`${isBanned ? CHEATER_CLOWN_EMOJI : ""}${nick}'s Contributions`)
        .setDescription(
          `${ctx.user.id === id ? `You have` : `This user has`} ${
            contributor
              ? `watered \`\`${ctx.game.name}\`\` ${contributor.count} times. ${
                  ctx.user.id === id ? `You` : `They `
                } are ranked #${contributorRank} out of ${ctx.game.contributors.length}.`
              : "not yet watered the christmas tree."
          }\n\n🪙Current Coin Balance: ${wallet ? wallet.coins : 0} coins.\n\n🔥Current Streak: ${
            wallet ? wallet.streak : 0
          } day${(wallet?.streak ?? 0) === 1 ? "" : "s"}.`
        )
    )
    .addComponents(
      new ActionRowBuilder().addComponents(await ctx.manager.components.createInstance("profile.refresh", { id, nick }))
    );
}
