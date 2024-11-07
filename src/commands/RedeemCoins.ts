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
import {
  fetchEntitlementsFromApi,
  consumeEntitlement,
  SMALL_POUCH_OF_COINS_SKU_ID,
  skuIdToCoins
} from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { PremiumButtons } from "../util/buttons/PremiumButtons";

const builder = new SlashCommandBuilder("redeemcoins", "Redeem all your coin purchases from the shop");

builder.setDMEnabled(false);

export class RedeemCoinsCommand implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) {
      return ctx.reply("This command can only be used in a server.");
    }

    return ctx.reply(await buildRedeemCoinsMessage(ctx));
  };

  public components = [
    new Button(
      "redeemcoins.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await buildRedeemCoinsMessage(ctx));
      }
    )
  ];
}

async function buildRedeemCoinsMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const entitlements = await fetchEntitlementsFromApi(userId, true, ctx.interaction.guild_id ?? ctx.game?.id, [
    SMALL_POUCH_OF_COINS_SKU_ID
  ]);

  if (entitlements.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Coins Redeemed")
      .setDescription("You have no coins to redeem.")
      .setFooter({ text: `You can purchase coins from the store by clicking on the bot avatar or the button.` });

    const message = new MessageBuilder().addEmbed(embed);
    const actions = new ActionRowBuilder();
    if (!process.env.DEV_MODE) {
      actions.addComponents(PremiumButtons.SmallPouchOfCoinsButton);
    }
    actions.addComponents(await ctx.manager.components.createInstance("redeemcoins.refresh"));
    message.addComponents(actions);
    return message;
  }

  let totalCoins = 0;

  for (const entitlement of entitlements) {
    const success = await consumeEntitlement(entitlement.id);
    if (success) {
      totalCoins += skuIdToCoins(entitlement.sku_id);
    }
  }

  if (totalCoins > 0) {
    await WalletHelper.addCoins(ctx.user.id, totalCoins);
  }

  const embed = new EmbedBuilder()
    .setTitle("Coins Redeemed")
    .setDescription(`You have successfully redeemed ${totalCoins} coins.`);

  const message = new MessageBuilder().addEmbed(embed);
  const actions = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("redeemcoins.refresh")
  );

  return message.addComponents(actions);
}
