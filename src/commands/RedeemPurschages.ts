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
  skuIdToCoins,
  skuIdToLuckyTickets,
  GOLDEN_COIN_STASH_SKU_ID,
  LUCKY_COIN_BAG_SKU_ID,
  TREASURE_CHEST_OF_COINS_SKU_ID,
  HOLIDAY_LUCKY_TICKET,
  LUCKY_TICKET_25,
  LUCKY_TICKET_50
} from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { PremiumButtons } from "../util/buttons/PremiumButtons";
import { WheelStateHelper } from "../util/wheel/WheelStateHelper";

const builder = new SlashCommandBuilder("redeempurschages", "Redeem all your purchases from the shop");

builder.setDMEnabled(false);

export class RedeemPurschagesCommand implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) {
      return await ctx.reply("This command can only be used in a server.");
    }

    return await ctx.reply(await buildRedeemCoinsMessage(ctx));
  };

  public components = [
    new Button(
      "redeemcoins.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildRedeemCoinsMessage(ctx));
      }
    )
  ];
}

async function buildRedeemCoinsMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const entitlements = await fetchEntitlementsFromApi(userId, true, ctx.interaction.guild_id ?? ctx.game?.id, [
    SMALL_POUCH_OF_COINS_SKU_ID,
    GOLDEN_COIN_STASH_SKU_ID,
    LUCKY_COIN_BAG_SKU_ID,
    TREASURE_CHEST_OF_COINS_SKU_ID,
    HOLIDAY_LUCKY_TICKET,
    LUCKY_TICKET_25,
    LUCKY_TICKET_50
  ]);

  if (entitlements.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Purchases Redeemed")
      .setColor(0xff0000)
      .setDescription("You have no purchases to redeem.")
      .setFooter({ text: `You can purchase items from the store by clicking on the bot avatar or the button.` });

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
  let totalLuckyTickets = 0;

  for (const entitlement of entitlements) {
    const success = await consumeEntitlement(entitlement.id);
    if (success) {
      totalCoins += skuIdToCoins(entitlement.sku_id);
      totalLuckyTickets += skuIdToLuckyTickets(entitlement.sku_id);
    }
  }

  if (totalCoins > 0) {
    await WalletHelper.addCoins(ctx.user.id, totalCoins);
  }

  if (totalLuckyTickets > 0) {
    await WheelStateHelper.addTickets(ctx.user.id, totalLuckyTickets);
  }

  const embed = new EmbedBuilder()
    .setTitle("Purchases Redeemed")
    .setDescription(`You have successfully redeemed ${totalCoins} coins and ${totalLuckyTickets} lucky tickets.`);

  const message = new MessageBuilder().addEmbed(embed);
  const actions = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("redeemcoins.refresh")
  );

  return message.addComponents(actions);
}