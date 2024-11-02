import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandIntegerOption,
  SlashCommandUserOption
} from "interactions.ts";
import { CoinManager } from "../util/CoinManager";
import { Guild } from "../models/Guild";

const builder = new SlashCommandBuilder(
  "wallet",
  "Manage your wallet and transfer coins to other players."
)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("balance")
      .setDescription("Check your current coin balance.")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("transfer")
      .setDescription("Transfer coins to another player.")
      .addUserOption(
        new SlashCommandUserOption("recipient", "The player to transfer coins to.").setRequired(true)
      )
      .addIntegerOption(
        new SlashCommandIntegerOption("amount", "The amount of coins to transfer.").setRequired(true).setMinValue(1)
      )
  );

builder.setDMEnabled(false);

export class Wallet implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) return ctx.reply("This command can only be used in a server.");

    const subcommand = ctx.options.getSubcommand();

    if (subcommand === "balance") {
      return this.handleBalance(ctx);
    } else if (subcommand === "transfer") {
      return this.handleTransfer(ctx);
    }
  };

  private async handleBalance(ctx: SlashCommandContext): Promise<void> {
    const contributor = ctx.game.contributors.find((contributor) => contributor.userId === ctx.user.id);

    const balance = contributor ? contributor.wallet.coins : 0;

    const embed = new EmbedBuilder()
      .setTitle("Wallet Balance")
      .setDescription(`Your current coin balance is ${balance} coins.`);

    await ctx.reply(new MessageBuilder().addEmbed(embed));
  }

  private async handleTransfer(ctx: SlashCommandContext): Promise<void> {
    const recipientId = ctx.options.get("recipient")?.value as string;
    const amount = ctx.options.get("amount")?.value as number;

    if (recipientId === ctx.user.id) {
      return ctx.reply(SimpleError("You cannot transfer coins to yourself."));
    }

    const sender = ctx.game.contributors.find((contributor) => contributor.userId === ctx.user.id);
    const recipient = ctx.game.contributors.find((contributor) => contributor.userId === recipientId);

    if (!sender) {
      return ctx.reply(SimpleError("You do not have a wallet."));
    }

    if (!recipient) {
      return ctx.reply(SimpleError("The recipient does not have a wallet."));
    }

    if (amount <= 0) {
      return ctx.reply(SimpleError("The transfer amount must be a positive number."));
    }

    if (sender.wallet.coins < amount) {
      return ctx.reply(SimpleError("You do not have enough coins to complete the transfer."));
    }

    await CoinManager.removeCoins(sender.userId, amount);
    await CoinManager.addCoins(recipient.userId, amount);

    const embed = new EmbedBuilder()
      .setTitle("Coin Transfer")
      .setDescription(
        `You have successfully transferred ${amount} coins to <@${recipientId}>.\n\nYour new balance is ${
          sender.wallet.coins
        } coins.\n<@${recipientId}>'s new balance is ${recipient.wallet.coins} coins.`
      );

    await ctx.reply(new MessageBuilder().addEmbed(embed));

    // Log the transfer details for auditing purposes
    console.log(
      `Coin Transfer: Sender: ${ctx.user.id}, Recipient: ${recipientId}, Amount: ${amount}, Timestamp: ${new Date().toISOString()}`
    );
  }
}
