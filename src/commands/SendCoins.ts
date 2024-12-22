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
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { Metrics } from "../tracing/metrics";
import pino from "pino";

const logger = pino({
  level: "info"
});

const builder = new SlashCommandBuilder("sendcoins", "Transfer coins to another player.")
  .addUserOption(new SlashCommandUserOption("recipient", "The player to transfer coins to.").setRequired(true))
  .addIntegerOption(
    new SlashCommandIntegerOption("amount", "The amount of coins to transfer.")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(10000)
  );

builder.setDMEnabled(false);

export class SendCoinsCommand implements ISlashCommand {
  autocompleteHandler?: ((ctx: AutocompleteContext) => Promise<void>) | undefined;
  public components: Component[] = [];
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game)
      return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
    }
    return this.handleTransfer(ctx);
  };

  private async handleTransfer(ctx: SlashCommandContext): Promise<void> {
    const recipientId = ctx.options.get("recipient")?.value as string;
    const amount = ctx.options.get("amount")?.value as number;

    if (recipientId === ctx.user.id) {
      return await safeReply(ctx, SimpleError("You cannot transfer coins to yourself."));
    }

    if (ctx.isDM) {
      return await safeReply(ctx, SimpleError("This command can only be used in a server."));
    }

    if (!ctx.game) {
      return await safeReply(ctx, SimpleError("Game data missing."));
    }

    const sender = await WalletHelper.getWallet(ctx.user.id);
    const recipient = await WalletHelper.getWallet(recipientId);

    if (!sender) {
      return await safeReply(ctx, SimpleError("You do not have a wallet."));
    }

    if (!recipient) {
      return await safeReply(ctx, SimpleError("The recipient does not have a wallet."));
    }

    if (amount <= 0) {
      return await safeReply(ctx, SimpleError("The transfer amount must be a positive number."));
    }

    if (amount > sender.coins) {
      return await safeReply(
        ctx,
        SimpleError(`You do not have enough coins to complete the transfer. You have ${sender.coins} coins.`)
      );
    }

    await WalletHelper.removeCoins(sender.userId, amount);
    await WalletHelper.addCoins(recipient.userId, amount);

    const embed = new EmbedBuilder()
      .setTitle("🪙 Coin Transfer 🪙")
      .setDescription(
        `You have successfully transferred ${amount} coins to <@${recipientId}>.\n\nYour new balance is ${
          sender.coins - amount
        } coins.\n<@${recipientId}>'s new balance is ${recipient.coins + amount} coins.`
      )
      .setFooter({
        text: `Did you know? You can earn coins by playing minigames and using other commands.${
          ctx.game.hasAiAccess ? "" : " Premium servers earn more coins, have access to more minigames and much more!"
        }`
      });

    Metrics.recordSendCoinsMetric(sender.userId, recipient.userId, amount);

    await safeReply(ctx, new MessageBuilder().addEmbed(embed));

    // Log the transfer details for auditing purposes
    logger.info(
      `Coin Transfer: Sender: ${
        ctx.user.id
      }, Recipient: ${recipientId}, Amount: ${amount}, Timestamp: ${new Date().toISOString()}`
    );
  }
}
