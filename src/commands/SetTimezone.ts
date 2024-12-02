import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { TIMEZONES } from "../util/timezones";
import { updateEntitlementsToGame } from "../util/discord/DiscordApiExtensions";
import { permissionsExtractor } from "../util/bitfield-permission-calculator";

const builder = new SlashCommandBuilder("settimezone", "Set the time zone for your server.").addStringOption(
  new SlashCommandStringOption("timezone", "The time zone to set for your server.")
    .setRequired(true)
    .addChoices(...TIMEZONES.map((tz) => ({ name: tz, value: tz })))
);

builder.setDMEnabled(false);

export class SetTimezone implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) {
      const embed = new EmbedBuilder()
        .setTitle("Woah there!")
        .setColor(0xff0000)
        .setDescription("This command can only be used in a server.");
      return await ctx.reply(new MessageBuilder().addEmbed(embed));
    }
    if (!ctx.game) {
      const embed = new EmbedBuilder()
        .setTitle("Woah there!")
        .setColor(0xff0000)
        .setDescription("Use /plant to plant a tree for your server first.");
      return await ctx.reply(new MessageBuilder().addEmbed(embed));
    }

    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await ctx.reply(`You need the Manage Server permission to set the timezone of your christmas tree.`);

    await updateEntitlementsToGame(ctx);

    const timezone = ctx.options.get("timezone")?.value as string;

    if (!TIMEZONES.includes(timezone)) {
      const embed = new EmbedBuilder()
        .setTitle("Invalid Time Zone")
        .setColor(0xff0000)
        .setDescription("The provided time zone is not valid. Please choose a valid time zone.")
        .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/timezone/timezone-1.jpg");
      return await ctx.reply(new MessageBuilder().addEmbed(embed));
    }

    await Guild.updateOne({ id: ctx.interaction.guild_id }, { $set: { timeZone: timezone } });

    const embed = new EmbedBuilder()
      .setTitle("Time Zone Updated")
      .setColor(0x00ff00)
      .setDescription(`The time zone for your server has been updated to **${timezone}**.`)
      .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/timezone/timezone-1.jpg");

    return await ctx.reply(new MessageBuilder().addEmbed(embed));
  };

  public components = [];
}
