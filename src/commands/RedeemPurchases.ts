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
  LUCKY_TICKET_50,
  GOLDEN_COIN_STASH_WATERING_BOOSTER_SKU_ID,
  TREASURE_CHEST_OF_COINS_WATERING_BOOSTER_SKU_ID,
  skuIdToBooster
} from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { PremiumButtons } from "../util/buttons/PremiumButtons";
import { WheelStateHelper } from "../util/wheel/WheelStateHelper";
import { BoosterHelper, BoosterName } from "../util/booster/BoosterHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";

const builder = new SlashCommandBuilder("redeempurchases", "Redeem all your purchases from the shop");

builder.setDMEnabled(false);

export class RedeemPurchasesCommand implements ISlashCommand {
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
    LUCKY_TICKET_50,
    GOLDEN_COIN_STASH_WATERING_BOOSTER_SKU_ID,
    TREASURE_CHEST_OF_COINS_WATERING_BOOSTER_SKU_ID
  ]);

  if (entitlements.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎅 No Purchases to Redeem")
      .setColor(0xff0000)
      .setDescription("It looks like you haven't made any purchases yet. Check out the shop for some festive items! 🎄")
      .setFooter({
        text: `Click on the bot avatar or the button to visit the store and purchase exciting items for your tree! 🎄✨`
      });

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
  const boostersToApply: BoosterName[] = [];

  for (const entitlement of entitlements) {
    const success = await consumeEntitlement(entitlement.id);
    if (success) {
      totalCoins += skuIdToCoins(entitlement.sku_id);
      totalLuckyTickets += skuIdToLuckyTickets(entitlement.sku_id);
      const boosterToApply = skuIdToBooster(entitlement.sku_id);
      if (boosterToApply) {
        boostersToApply.push(boosterToApply);
      }
    }
  }

  const multiplier = SpecialDayHelper.shopPurschaseMultiplier();
  if (multiplier !== 1) {
    totalCoins = Math.floor(totalCoins * multiplier);
    totalLuckyTickets = Math.floor(totalLuckyTickets * multiplier);
  }

  if (totalCoins > 0) {
    await WalletHelper.addCoins(ctx.user.id, totalCoins);
  }

  if (totalLuckyTickets > 0) {
    await WheelStateHelper.addTickets(ctx.user.id, totalLuckyTickets);
  }

  for (const booster of boostersToApply) {
    await BoosterHelper.addBooster(ctx, booster);
  }

  const boostersDescription = boostersToApply.map((booster) => `**${booster} Booster**`).join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🎁 Purchases Redeemed! 🎄")
    .setDescription(
      `You have successfully redeemed:\n\n` +
        `🪙 **${totalCoins} coins**\n` +
        `🎟️ **${totalLuckyTickets} lucky tickets**\n` +
        `${boostersDescription ? `✨ **Boosters:**\n${boostersDescription}` : ""}` +
        `${
          multiplier !== 1 ? `\n\n🎉 **Special Day Multiplier Applied!** You received ${multiplier}x more rewards!` : ""
        }`
    )
    .setColor(0x00ff00)
    .setFooter({ text: "Thank you for your purchases! Enjoy the festive season! 🎅" });

  const message = new MessageBuilder().addEmbed(embed);
  const actions = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("redeemcoins.refresh")
  );

  return message.addComponents(actions);
}
