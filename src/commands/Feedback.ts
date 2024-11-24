import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { FeedbackPost, postFeedback } from "../util/postFeedback";
import { SUPPORT_SERVER_INVITE } from "../util/const";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";

const builder = new SlashCommandBuilder(
  "feedback",
  "Got some feedback? Don't hesitate to submit it to us :)"
).addStringOption(new SlashCommandStringOption("content", "The feedback you want to submit").setRequired(true));

builder.setDMEnabled(false);

export class Feedback implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await ctx.reply(BanHelper.getBanEmbed(ctx.user.username));
    }
    const feedback: FeedbackPost = {
      content: ctx.options.get("content")?.value as string,
      sendingServer: ctx.interaction.guild_id ?? "DM",
      sendingUser: ctx.user.username,
      sendingUserId: ctx.user.id
    };

    postFeedback(feedback);

    return await ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder().setTitle(
          `Thanks for submitting your feedback! We'll look into it. If you have a question, please join our support server ${SUPPORT_SERVER_INVITE}`
        )
      )
    );
  };

  public components = [];
}
