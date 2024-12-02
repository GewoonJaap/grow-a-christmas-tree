import { EmbedBuilder, ISlashCommand, MessageBuilder, SlashCommandBuilder, SlashCommandContext } from "interactions.ts";
import { SUPPORT_SERVER_INVITE } from "../util/const";

export class About implements ISlashCommand {
  public builder = new SlashCommandBuilder("about", "Learn about all the magical commands!");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return await ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder()
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
          🏆 **/recycle** - Recycle your tree to start again.

          **Profile and Rewards**
          👤 **/profile** - View your profile and the amount of coins you have.
          📖 **/dailyreward** - Claim your daily supply of free coins.
          🎁 **/adventcalendar** - Open your daily advent calendar present.
          🪙 **/redeemcoins** - Redeem any outstanding purchases from the shop.
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

          🔔 **/notifications** - Setup tree watering notifications.
          ⏲️ **/settimezone** - Set the timezone for your tree, so that dates en times are correctly shown.       

          **Support**
          🎅 **[Join the support server](${SUPPORT_SERVER_INVITE})** for help and updates.
          `
          )
      )
    );
  };

  public components = [];
}
