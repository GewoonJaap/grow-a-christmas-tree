import {
  ISlashCommand,
  MessageBuilder,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandContext,
  SlashCommandRoleOption,
  SlashCommandStringOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { createWebhook } from "../util/discord/DiscordWebhookHelper";

const builder = new SlashCommandBuilder("notificationSettings", "Configure the role and channel for notifications.")
  .addRoleOption(new SlashCommandRoleOption("role", "Role to ping for notifications").setRequired(false))
  .addChannelOption(new SlashCommandChannelOption("channel", "Channel to send notifications").setRequired(false))
  .addBooleanOption(new SlashCommandBooleanOption("enabled", "Turn notification on or off").setRequired(true));

builder.setDMEnabled(false);

export class NotificationSettings implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM)
      return ctx.reply(
        new MessageBuilder().setContent("This command can only be used in a server.").setEphemeral(true)
      );
    if (!ctx.game)
      return ctx.reply(
        new MessageBuilder().setContent("Use /plant to plant a tree for your server first.").setEphemeral(true)
      );
    const role = ctx.options.get("role")?.value as string | undefined;
    const channel = ctx.options.get("channel")?.value as string | undefined;
    const enabled = ctx.options.get("enabled")?.value as boolean | undefined;

    if (!enabled) {
      await Guild.updateOne(
        { id: ctx.interaction.guild_id },
        { $unset: { notificationRoleId: "", webhookId: "", webhookToken: "" } }
      );
      return ctx.reply(new MessageBuilder().setContent("Notifications have been turned off.").setEphemeral(true));
    }

    if (!role || !channel) {
      return ctx.reply(
        new MessageBuilder().setContent("Please provide the following options: role or channel.").setEphemeral(true)
      );
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

      return ctx.reply(
        new MessageBuilder()
          .setContent(`Notification settings updated. Role: ${role}, Channel: ${channel}, Enabled: ${enabled}`)
          .setEphemeral(true)
      );
    } catch (err) {
      console.error(err);
      return ctx.reply(
        new MessageBuilder()
          .setContent(
            "An error occurred while updating the notification settings. Does the bot have the Manage Webhooks permission?"
          )
          .setEphemeral(true)
      );
    }
  };

  public components = [];
}
