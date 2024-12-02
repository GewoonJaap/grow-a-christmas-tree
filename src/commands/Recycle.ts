import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext
} from "interactions.ts";
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
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await ctx.reply(BanHelper.getBanEmbed(ctx.user.username));
    }
    //only with manage server perms
    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await ctx.reply(`You need the Manage Server permission to recycle your christmas tree.`);

    const guildToRemove = await Guild.findOne({ id: ctx.interaction.guild_id });

    if (guildToRemove === null) return await ctx.reply(`You don't have a christmas tree planted in this server.`);

    const embed = new EmbedBuilder()
      .setTitle("Recycle Confirmation")
      .setDescription("Are you sure you want to recycle your christmas tree? This action cannot be undone.")
      .setFooter({
        text: "When you recycle your christmas tree, you will lose all your progress and your tree will be removed."
      })
      .setColor(0xff0000);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("recycle.confirm", { guildId: ctx.interaction.guild_id })
    );

    return await ctx.reply(new MessageBuilder().addEmbed(embed).addComponents(actionRow));
  };

  public components = [
    new Button(
      "recycle.confirm",
      new ButtonBuilder().setLabel("Confirm Recycle").setEmoji({ name: "♻️" }).setStyle(4), // Style 4 is the danger style (red)
      async (ctx: ButtonContext<{ guildId: string }>): Promise<void> => {
        const guildToRemove = await Guild.findOne({ id: ctx.game?.id });

        if (guildToRemove === null) return await ctx.reply(`You don't have a christmas tree planted in this server.`);

        await guildToRemove.deleteOne();

        return await ctx.reply(
          new MessageBuilder()
            .addEmbed(new EmbedBuilder().setTitle(`Recycled!`).setDescription(`Your christmas tree has been recycled!`))
            .setComponents([])
        );
      }
    )
  ];
}
