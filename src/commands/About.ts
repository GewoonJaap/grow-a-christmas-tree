import { EmbedBuilder, ISlashCommand, MessageBuilder, SlashCommandBuilder, SlashCommandContext } from "interactions.ts";

export class About implements ISlashCommand {
  public builder = new SlashCommandBuilder("about", "Some information about the bot.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder().setTitle("About Us").setDescription(
          `
          <@1050722873569968128> lets you plant a christmas tree in your Discord server, water it, and watch it grow.

          The christmas tree cannot be watered by the same person twice, and takes longer to grow as its size increases. Your community must therefore co-operate to always keep it growing and compete with the tallest trees on the leaderboard.
          
          You can invite it by clicking on its profile, or by [clicking here :)](https://discord.com/api/oauth2/authorize?client_id=1050722873569968128&permissions=2147486720&scope=bot%20applications.commands) Enjoy!`
        )
      )
    );
  };

  public components = [];
}
