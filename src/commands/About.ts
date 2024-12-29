import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { SUPPORT_SERVER_INVITE } from "../util/const";
import { safeReply } from "../util/discord/MessageExtenstions";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { trace, SpanStatusCode } from "@opentelemetry/api";

export class About implements ISlashCommand {
  public builder = new SlashCommandBuilder("about", "Learn about all the magical commands!");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("AboutCommandHandler", async (span) => {
      try {
        const result = await safeReply(ctx, await this.buildAboutMessage(ctx));
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  };

  public components = [
    new Button(
      "about.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await this.buildAboutMessage(ctx));
      }
    )
  ];

  private async buildAboutMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("buildAboutMessage", async (span) => {
      try {
        const festiveMessage = SpecialDayHelper.getFestiveMessage();
        const embed = new EmbedBuilder()
          .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/about/about-1.jpg")
          .setTitle("🎅 About Christmas Tree")
          .setDescription(
            `
            🎄 **Welcome to Grow a Christmas Tree!** 🎄

            <@1050722873569968128> lets you plant a Christmas tree in your Discord server, water it, and watch it grow. The tree cannot be watered by the same person twice in a row, and it takes longer to grow as its size increases. Your community must cooperate to keep it growing and compete with the tallest trees on the leaderboard.

            **Here are some commands you can use:**

            **Tree Commands**
            🌳 **/tree** - Show and water your community's tree!
            ♻️ **/composter** - Show and upgrade your community's composter, speeding up your tree's growth!
            🌱 **/plant** - Plant a new tree for your server.

            **Profile and Rewards**
            👤 **/profile** - View your profile and the amount of coins you have.
            📖 **/dailyreward** - Claim your daily supply of free coins.
            🎁 **/adventcalendar** - Open your daily advent calendar present.
            🪙 **/redeempurchases** - Redeem any outstanding purchases from the shop.
            💸 **/sendcoins** - Transfer coins to another player.
            🛒 **/shop** - Browse and grab magical items from the shop to power up your tree!

            **Leaderboards**
            🏆 **/forest** - See the leaderboard of all the Christmas trees.
            🪙 **/leaderboard** - See your server's leaderboard.

            **Feedback and Information**
            📖 **/about** - Show this information message :)
            ⚙️ **/feedback** - Send feedback to the developers.

            **ADMIN COMMANDS**
            These require the Manage Server permission.

            ✨ **/styles** - Manage your unlocked tree styles.
            🔔 **/notifications** - Setup tree watering notifications.
            ⏲️ **/settimezone** - Set the timezone for your tree, so that dates en times are correctly shown.
            ✏️ **/rename** - Rename your Christmas tree.
            🏆 **/recycle** - Recycle your tree to start again.

            **Support**
            🎅 **[Join the support server](${SUPPORT_SERVER_INVITE})** for help and updates.
            🛒 **[Visit the store](https://discord.com/application-directory/1050722873569968128/store)** to support the bot by purchasing items.
            `
          );

        if (festiveMessage.isPresent) {
          embed.setFooter({ text: festiveMessage.message });
        }

        const actionRow = new ActionRowBuilder().addComponents(
          await ctx.manager.components.createInstance("about.refresh")
        );

        span.setStatus({ code: SpanStatusCode.OK });
        return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
