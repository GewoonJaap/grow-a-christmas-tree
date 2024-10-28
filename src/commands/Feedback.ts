import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { FeedbackPost, postFeedback } from "../util/postFeedback";

const builder = new SlashCommandBuilder(
  "feedback",
  "Got some feedback? Don't hesitate to submit it to us :)"
).addStringOption(new SlashCommandStringOption("content", "The feedback you want to submit").setRequired(true));

builder.setDMEnabled(false);

export class Feedback implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const feedback: FeedbackPost = {
      content: ctx.options.get("content")?.value as string,
      sendingServer: ctx.interaction.guild_id ?? "DM",
      sendingUser: ctx.user.username
    };

    postFeedback(feedback);

    return ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder().setTitle(`Thanks for submitting your feedback! We'll look into it. If you have a question, please join our support server [here](https://discord.gg/KEJwtK5Z8k).`)
      )
    );
  };

  public components = [];
}
