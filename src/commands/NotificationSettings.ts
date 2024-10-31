import {
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { Guild } from "../models/Guild";

const builder = new SlashCommandBuilder("notificationSettings", "Configure the role and channel for notifications.")
  .addStringOption(new SlashCommandStringOption("role", "Role to ping for notifications").setRequired(false))
  .addStringOption(new SlashCommandStringOption("channel", "Channel to send notifications").setRequired(false));

builder.setDMEnabled(false);

export class NotificationSettings implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const role = ctx.options.get("role")?.value as string | undefined;
    const channel = ctx.options.get("channel")?.value as string | undefined;

    if (!role && !channel) {
      return ctx.reply(
        new MessageBuilder().setContent(
          "Please provide at least one option: role or channel."
        ).setEphemeral(true)
      );
    }

    if (role === "off" || channel === "off") {
      await Guild.updateOne(
        { id: ctx.interaction.guild_id },
        { $unset: { notificationRoleId: "", notificationChannelId: "" } }
      );
      return ctx.reply(
        new MessageBuilder().setContent(
          "Notifications have been turned off."
        ).setEphemeral(true)
      );
    }

    const updateData: { notificationRoleId?: string; notificationChannelId?: string } = {};
    if (role) updateData.notificationRoleId = role;
    if (channel) updateData.notificationChannelId = channel;

    await Guild.updateOne({ id: ctx.interaction.guild_id }, { $set: updateData });

    return ctx.reply(
      new MessageBuilder().setContent(
        `Notification settings updated. Role: ${role ?? "unchanged"}, Channel: ${channel ?? "unchanged"}`
      ).setEphemeral(true)
    );
  };

  public components = [];
}
