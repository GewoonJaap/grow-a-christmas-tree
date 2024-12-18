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
import { safeReply } from "../util/discord/MessageExtenstions";

const builder = new SlashCommandBuilder(
  "recycle",
  "Send your Christmas tree to the recycling center and make way for a brand new tree to grow! 🌟♻️"
);

builder.setDMEnabled(false);

export class Recycle implements ISlashCommand {
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
    //only with manage server perms
    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await safeReply(
        ctx,
        new MessageBuilder().setContent(`You need the Manage Server permission to recycle your christmas tree.`)
      );

    const guildToRemove = await Guild.findOne({ id: ctx.interaction.guild_id });

    if (guildToRemove === null)
      return await safeReply(
        ctx,
        new MessageBuilder().setContent(`You don't have a christmas tree planted in this server.`)
      );

    const embed = new EmbedBuilder()
      .setTitle("🎄 Confirm Tree Recycling")
      .setDescription(
        "Are you sure you want to recycle your Christmas tree? This action is permanent and cannot be undone. 🌟♻️"
      )
      .setFooter({
        text: "Recycling your Christmas tree will reset all progress, and your tree will be permanently removed. Proceed with care! ♻️✨"
      })
      .setColor(0xff0000);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("recycle.confirm", { guildId: ctx.interaction.guild_id })
    );

    return await safeReply(ctx, new MessageBuilder().addEmbed(embed).addComponents(actionRow));
  };

  public components = [
    new Button(
      "recycle.confirm",
      new ButtonBuilder().setLabel("Confirm Recycle").setEmoji({ name: "♻️" }).setStyle(4), // Style 4 is the danger style (red)
      async (ctx: ButtonContext<{ guildId: string }>): Promise<void> => {
        const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);
        if (!perms.includes("MANAGE_GUILD"))
          return await safeReply(
            ctx,
            new MessageBuilder().setContent(`You need the Manage Server permission to recycle your christmas tree.`)
          );

        const guildToRemove = await Guild.findOne({ id: ctx.game?.id });

        if (guildToRemove === null)
          return await safeReply(
            ctx,
            new MessageBuilder().setContent(`You don't have a christmas tree planted in this server.`)
          );

        await guildToRemove.deleteOne();

        return await safeReply(
          ctx,
          new MessageBuilder()
            .addEmbed(
              new EmbedBuilder()
                .setTitle(`🎄 Tree Recycled!`)
                .setDescription(`Your Christmas tree has been recycled, making room for fresh festive growth! 🌟♻️`)
            )
            .setComponents([])
        );
      }
    )
  ];
}
