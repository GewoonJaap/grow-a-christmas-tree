import { EmbedBuilder, ISlashCommand, MessageBuilder, SlashCommandBuilder, SlashCommandContext } from "interactions.ts";
import { Guild } from "../models/Guild";
import { permissionsExtractor } from "../util/bitfield-permission-calculator";

const builder = new SlashCommandBuilder(
  "recycle",
  "Send your christmas tree to the recycling center, so you can plant a fresh tree"
);

builder.setDMEnabled(false);

export class Recycle implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.game === null) return ctx.reply(`You don't have a christmas tree planted in this server.`);

    //only with manage server perms
    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return ctx.reply(`You need the Manage Server permission to recycle your christmas tree.`);

    const guildToRemove = await Guild.findOne({ id: ctx.interaction.guild_id });

    if (guildToRemove === null) return ctx.reply(`You don't have a christmas tree planted in this server.`);

    await guildToRemove.delete();

    return ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder().setTitle(`Recycled!`).setDescription(`Your christmas tree has been recycled!`)
      )
    );
  };

  public components = [];
}
