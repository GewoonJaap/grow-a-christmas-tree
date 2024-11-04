import {
  AutocompleteContext,
  Component,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import {
  fetchEntitlementsFromApi,
  consumeEntitlement,
  SMALL_POUCH_OF_COINS_SKU_ID,
  skuIdToCoins
} from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";

const builder = new SlashCommandBuilder("redeemcoins", "Redeem all consumable SKUs for coins.");

builder.setDMEnabled(false);

export class RedeemCoinsCommand implements ISlashCommand {
  autocompleteHandler?: ((ctx: AutocompleteContext) => Promise<void>) | undefined;
  components: Component[] = [];
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) {
      return ctx.reply("This command can only be used in a server.");
    }

    const userId = ctx.user.id;
    const entitlements = await fetchEntitlementsFromApi(userId, true, [SMALL_POUCH_OF_COINS_SKU_ID]);

    if (entitlements.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("Coins Redeemed")
        .setDescription("You have no coins to redeem.")
        .setFooter({ text: `You can coins from the store by clicking on the bot avatar.` });
      return ctx.reply(new MessageBuilder().addEmbed(embed));
    }

    let totalCoins = 0;

    for (const entitlement of entitlements) {
      const success = await consumeEntitlement(entitlement.id);
      if (success) {
        totalCoins += skuIdToCoins(entitlement.sku_id);
      }
    }

    if (totalCoins > 0) {
      await WalletHelper.addCoins(userId, totalCoins);
    }

    const embed = new EmbedBuilder()
      .setTitle("Coins Redeemed")
      .setDescription(`You have successfully redeemed ${totalCoins} coins.`);

    return ctx.reply(new MessageBuilder().addEmbed(embed));
  };
}
