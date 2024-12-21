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
import { fetchEntitlementsFromApi, consumeEntitlement, SKU_REWARDS, SKU } from "../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { PremiumButtons } from "../util/buttons/PremiumButtons";
import { WheelStateHelper } from "../util/wheel/WheelStateHelper";
import { BoosterHelper, BoosterName } from "../util/booster/BoosterHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { Metrics } from "../tracing/metrics"; // Import Metrics

const builder = new SlashCommandBuilder("redeempurchases", "Redeem all your purchases from the shop");

builder.setDMEnabled(false);

export class RedeemPurchasesCommand implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game) {
      return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
    }

    return await safeReply(ctx, await buildRedeemCoinsMessage(ctx));
  };

  public components = [
    new Button(
      "redeemcoins.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await buildRedeemCoinsMessage(ctx));
      }
    )
  ];
}

async function buildRedeemCoinsMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const entitlements = await fetchEntitlementsFromApi(
    userId,
    true,
    ctx.interaction.guild_id ?? ctx.game?.id,
    Object.keys(SKU_REWARDS) as SKU[]
  );

  const consumableEntitlements = entitlements.filter(
    (entitlement) => SKU_REWARDS[entitlement.sku_id as SKU]?.isConsumable
  );

  if (consumableEntitlements.length === 0) {
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

  for (const entitlement of consumableEntitlements) {
    const reward = SKU_REWARDS[entitlement.sku_id as SKU];
    if (!reward) {
      console.error(`No reward found for SKU ${entitlement.sku_id}`);
      continue;
    }
    const success = await consumeEntitlement(entitlement.id, entitlement.sku_id as SKU);
    if (success) {
      totalCoins += reward.coins;
      totalLuckyTickets += reward.luckyTickets;
      if (reward.booster) {
        boostersToApply.push(reward.booster);
      }
      // Log item name and other relevant details when a purchase is redeemed
      Metrics.recordShopPurchaseMetric(entitlement.sku_id, userId, ctx.interaction.guild_id ?? ctx.game?.id);
    }
  }

  const shopPurchaseMultiplierData = SpecialDayHelper.getSpecialDayMultipliers();
  if (shopPurchaseMultiplierData.isActive) {
    totalCoins = Math.floor(totalCoins * shopPurchaseMultiplierData.realMoneyShop.multiplier);
    totalLuckyTickets = Math.floor(totalLuckyTickets * shopPurchaseMultiplierData.realMoneyShop.multiplier);
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
          shopPurchaseMultiplierData.isActive
            ? `\n\n🎉 **Special Day Multiplier Applied!** ${shopPurchaseMultiplierData.realMoneyShop.reason}`
            : ""
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
