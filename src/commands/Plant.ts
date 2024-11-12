import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { validateTreeName } from "../util/validate-tree-name";

const builder = new SlashCommandBuilder("plant", "Plant a christmas tree for your server.").addStringOption(
  new SlashCommandStringOption("name", "A name for your server's christmas tree.").setRequired(true)
);

builder.setDMEnabled(false);

export class Plant implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) return await ctx.reply("This command can only be used in a server.");
    if (ctx.game !== null)
      return await ctx.reply(
        `A christmas tree has already been planted in this server called \`\`${ctx.game.name}\`\`.`
      );
    if (ctx.interaction.guild_id === undefined) return await ctx.reply(SimpleError("Guild ID missing."));

    const name = ctx.options.get("name")?.value as string | undefined;
    if (name === undefined) return await ctx.reply(SimpleError("Name not found."));

    if (!validateTreeName(name))
      return await ctx.reply(
        SimpleError(
          "Your christmas tree name must be 1-36 characters, and contain only alphanumeric characters, hyphens, and apostrophes."
        )
      );

    await new Guild({
      id: ctx.interaction.guild_id,

      name: name,

      lastWateredAt: Math.floor(Date.now() / 1000),
      lastWateredBy: ctx.user.id,

      contributors: [
        {
          userId: ctx.user.id,
          count: 1
        }
      ]
    }).save();

    return await ctx.reply(
      new MessageBuilder().addEmbed(new EmbedBuilder().setTitle(`You planted \`\`${name}\`\` in your server!`))
    );
  };

  public components = [];
}
