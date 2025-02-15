import {
  ActionRowBuilder,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandContext,
  SlashCommandRoleOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { createWebhook } from "../util/discord/DiscordWebhookHelper";
import { PremiumButtons } from "../util/buttons/PremiumButtons";
import { updateEntitlementsToGame } from "../util/discord/DiscordApiExtensions";
import { permissionsExtractor } from "../util/bitfield-permission-calculator";
import { safeReply } from "../util/discord/MessageExtenstions";

const builder = new SlashCommandBuilder("notifications", "Configure the role and channel for notifications.")
  .addBooleanOption(new SlashCommandBooleanOption("enabled", "Turn notification on or off").setRequired(true))
  .addRoleOption(new SlashCommandRoleOption("role", "Role to ping for notifications").setRequired(false))
  .addChannelOption(new SlashCommandChannelOption("channel", "Channel to send notifications").setRequired(false));

builder.setDMEnabled(false);

export class NotificationSettings implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) {
      const embed = new EmbedBuilder()
        .setTitle("Woah there!")
        .setColor(0xff0000)
        .setDescription("This command can only be used in a server.");
      return await safeReply(ctx, new MessageBuilder().addEmbed(embed).setEphemeral(true));
    }
    if (!ctx.game) {
      const embed = new EmbedBuilder()
        .setTitle("Woah there!")
        .setColor(0xff0000)
        .setDescription("Use /plant to plant a tree for your server first.");
      return await safeReply(ctx, new MessageBuilder().addEmbed(embed).setEphemeral(true));
    }

    await updateEntitlementsToGame(ctx);
    if (!ctx.game.hasAiAccess) {
      const embed = new EmbedBuilder()
        .setDescription(
          "You have just discovered a premium only feature! Visit the [shop](https://discord.com/application-directory/1050722873569968128/store) or click the bot avatar and buy the [Festive Forest subscription](https://discord.com/application-directory/1050722873569968128/store/1298016263687110697) to gain access."
        )
        .setTitle("Woah there!")
        .setColor(0xff0000)
        .setFooter({ text: "Enjoying the bot? Consider supporting us by buying a subscription!" });
      const message = new MessageBuilder().addEmbed(embed);
      if (!process.env.DEV_MODE) {
        const actionBuilder = new ActionRowBuilder();
        actionBuilder.addComponents(PremiumButtons.FestiveForestButton);
        message.addComponents(actionBuilder);
      }
      return await safeReply(ctx, message);
    }

    //only with manage server perms
    const perms = permissionsExtractor((ctx.interaction.member?.permissions as unknown as number) ?? 0);

    if (!perms.includes("MANAGE_GUILD"))
      return await safeReply(ctx, SimpleError("You need `Manage Server` permission to use this command."));

    const role = ctx.options.get("role")?.value as string | undefined;
    const channel = ctx.options.get("channel")?.value as string | undefined;
    const enabled = ctx.options.get("enabled")?.value as boolean | undefined;

    if (!enabled) {
      await Guild.updateOne(
        { id: ctx.interaction.guild_id },
        { $unset: { notificationRoleId: "", webhookId: "", webhookToken: "" } }
      );
      return await safeReply(
        ctx,
        new MessageBuilder().setContent("Notifications have been turned off.").setEphemeral(true)
      );
    }

    if (!role || !channel) {
      const embed = new EmbedBuilder()
        .setTitle("Missing Options")
        .setColor(0xff0000)
        .setDescription("Please provide the following options: role or channel.");
      return await safeReply(ctx, new MessageBuilder().addEmbed(embed).setEphemeral(true));
    }

    const updateData: { notificationRoleId?: string; webhookId?: string; webhookToken?: string } = {};

    try {
      const webhook = await createWebhook(
        ctx.interaction.channel_id,
        "Tree Notifications",
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/stage-5.png"
      );

      updateData.notificationRoleId = role;
      updateData.webhookId = webhook.id;
      updateData.webhookToken = webhook.token;

      await Guild.updateOne({ id: ctx.interaction.guild_id }, { $set: updateData });

      const embed = new EmbedBuilder().setTitle(`Notification Settings ${enabled ? "Enabled" : "Disabled"}`);

      if (enabled) {
        embed.setDescription(`Role: <@&${role}>\nChannel: <#${channel}>`);
      }
      return await safeReply(ctx, new MessageBuilder().addEmbed(embed).setEphemeral(true));
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setColor(0xff0000)
        .setDescription(
          "An error occurred while updating the notification settings. Does the bot have `Manage Webhook` permissions? Check our guide on how to set up notifications [here](https://christmas-tree.app/how-to-setup-notifications/?utm_source=setup-notif-bot)."
        );
      return await safeReply(ctx, new MessageBuilder().addEmbed(embed).setEphemeral(true));
    }
  };

  public components = [];
}
