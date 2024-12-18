import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { validateTreeName } from "../util/validate-tree-name";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { permissionsExtractor } from "../util/bitfield-permission-calculator";
import { safeReply } from "../util/discord/MessageExtenstions";

const builder = new SlashCommandBuilder("rename", "🎄 Rename your Christmas Tree").addStringOption(
  new SlashCommandStringOption("name", "Give your tree a new festive name").setRequired(true)
);

builder.setDMEnabled(false);

export class Rename implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM)
      return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
    if (ctx.game === null)
      return await safeReply(
        ctx,
        new MessageBuilder().setContent("You don't have a christmas tree planted in this server.")
      );
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
    }

    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await safeReply(
        ctx,
        new MessageBuilder().setContent(`You need the Manage Server permission to rename your christmas tree.`)
      );

    const name = ctx.options.get("name")?.value as string | undefined;
    if (name === undefined) return await safeReply(ctx, SimpleError("Name not found."));

    if (!validateTreeName(name))
      return await safeReply(
        ctx,
        SimpleError(
          "Your Christmas tree name must be between 1-36 characters and can only contain alphanumeric characters, hyphens, and apostrophes. ✨"
        )
      );

    ctx.game.name = name;
    await ctx.game.save();

    return await safeReply(
      ctx,
      new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("🎄 Tree Renamed!")
          .setDescription(`Your Christmas tree has been renamed to \`\`${name}\`\`! Watch it grow! ✨🌟`)
          .setFooter({ text: `Run /tree to see the new name of your Christmas tree! ✨🌱` })
      )
    );
  };

  public components = [];
}
