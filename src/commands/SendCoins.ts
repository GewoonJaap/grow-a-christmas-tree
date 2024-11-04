import {
  AutocompleteContext,
  Component,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandIntegerOption,
  SlashCommandUserOption
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";

const builder = new SlashCommandBuilder("sendcoins", "Transfer coins to another player.")
  .addUserOption(new SlashCommandUserOption("recipient", "The player to transfer coins to.").setRequired(true))
  .addIntegerOption(
    new SlashCommandIntegerOption("amount", "The amount of coins to transfer.")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1000)
  );

builder.setDMEnabled(false);

export class SendCoinsCommand implements ISlashCommand {
  autocompleteHandler?: ((ctx: AutocompleteContext) => Promise<void>) | undefined;
  public components: Component[] = [];
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) return ctx.reply("This command can only be used in a server.");

    return this.handleTransfer(ctx);
  };

  private async handleTransfer(ctx: SlashCommandContext): Promise<void> {
    const recipientId = ctx.options.get("recipient")?.value as string;
    const amount = ctx.options.get("amount")?.value as number;

    if (recipientId === ctx.user.id) {
      return ctx.reply(SimpleError("You cannot transfer coins to yourself."));
    }

    if (ctx.isDM) {
      return ctx.reply(SimpleError("This command can only be used in a server."));
    }

    if (!ctx.game) {
      return ctx.reply(SimpleError("Game data missing."));
    }

    const sender = await WalletHelper.getWallet(ctx.user.id);
    const recipient = await WalletHelper.getWallet(recipientId);

    if (!sender) {
      return ctx.reply(SimpleError("You do not have a wallet."));
    }

    if (!recipient) {
      return ctx.reply(SimpleError("The recipient does not have a wallet."));
    }

    if (amount <= 0) {
      return ctx.reply(SimpleError("The transfer amount must be a positive number."));
    }

    if (sender.coins < amount) {
      return ctx.reply(
        SimpleError(`You do not have enough coins to complete the transfer. You have ${sender.coins} coins.`)
      );
    }

    await WalletHelper.removeCoins(sender.userId, amount);
    await WalletHelper.addCoins(recipient.userId, amount);

    const embed = new EmbedBuilder()
      .setTitle("Coin Transfer")
      .setDescription(
        `You have successfully transferred ${amount} coins to <@${recipientId}>.\n\nYour new balance is ${
          sender.coins - amount
        } coins.\n<@${recipientId}>'s new balance is ${recipient.coins + amount} coins.`
      )
      .setFooter({
        text: `Did you know? You can earn coins by playing minigames and using other commands.${
          ctx.game.hasAiAccess ? "" : " Premium servers earn more coins!"
        }`
      });

    await ctx.reply(new MessageBuilder().addEmbed(embed));

    // Log the transfer details for auditing purposes
    console.log(
      `Coin Transfer: Sender: ${
        ctx.user.id
      }, Recipient: ${recipientId}, Amount: ${amount}, Timestamp: ${new Date().toISOString()}`
    );
  }
}
