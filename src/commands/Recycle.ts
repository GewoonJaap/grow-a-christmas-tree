import { EmbedBuilder, ISlashCommand, MessageBuilder, SlashCommandBuilder, SlashCommandContext } from "interactions.ts";
import { Guild } from "../models/Guild";
import { permissionsExtractor } from "../util/bitfield-permission-calculator";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";

const builder = new SlashCommandBuilder(
  "recycle",
  "Send your christmas tree to the recycling center, so you can plant a fresh tree"
);

builder.setDMEnabled(false);

export class Recycle implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) return await ctx.reply("This command can only be used in a server.");
    if (ctx.game === null) return await ctx.reply(`You don't have a christmas tree planted in this server.`);
    if (
      UnleashHelper.isEnabled(
        UNLEASH_FEATURES.banEnforcement.name,
        ctx,
        UNLEASH_FEATURES.banEnforcement.fallbackValue
      ) &&
      (await BanHelper.isUserBanned(ctx.user.id))
    ) {
      return await ctx.reply(BanHelper.getBanEmbed(ctx.user.username));
    }
    //only with manage server perms
    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await ctx.reply(`You need the Manage Server permission to recycle your christmas tree.`);

    const guildToRemove = await Guild.findOne({ id: ctx.interaction.guild_id });

    if (guildToRemove === null) return await ctx.reply(`You don't have a christmas tree planted in this server.`);

    await guildToRemove.deleteOne();

    return await ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder().setTitle(`Recycled!`).setDescription(`Your christmas tree has been recycled!`)
      )
    );
  };

  public components = [];
}
