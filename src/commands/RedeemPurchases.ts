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
import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const logger = pino({
  level: "info"
});

const builder = new SlashCommandBuilder("redeempurchases", "Redeem all your purchases from the shop");

builder.setDMEnabled(false);

export class RedeemPurchasesCommand implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("RedeemPurchasesCommandHandler", async (span) => {
      const startTime = new Date();
      const userId = ctx.user.id;
      const guildId = ctx.interaction.guild_id ?? ctx.game?.id ?? "Unknown";
      let initialCoins = 0;
      let initialLuckyTickets = 0;

      try {
        if (ctx.isDM || !ctx.game) {
          const result = await safeReply(
            ctx,
            new MessageBuilder().setContent("This command can only be used in a server.")
          );
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        }

        const wallet = await WalletHelper.getWallet(userId);
        initialCoins = wallet.coins;

        const wheelState = await WheelStateHelper.getWheelState(userId);
        initialLuckyTickets = wheelState.tickets;

        const result = await safeReply(ctx, await buildRedeemCoinsMessage(ctx));
        span.setStatus({ code: SpanStatusCode.OK });

        const endTime = new Date();
        const finalCoins = wallet.coins;
        const finalLuckyTickets = wheelState.tickets;

        logger.info(
          {
            userId,
            timestamp: endTime.toISOString(),
            initialCoins,
            finalCoins,
            initialLuckyTickets,
            finalLuckyTickets,
            boostersApplied: ctx.game.activeBoosters.map((booster) => booster.type),
            success: true,
            specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
            skuRedeemed: "N/A",
            displayNameRedeemed: "N/A",
            guildId,
            duration: endTime.getTime() - startTime.getTime(),
            message: "Redemption operation completed successfully."
          },
          `Redemption operation completed successfully for user ${userId} with ${finalCoins - initialCoins} coins and ${
            finalLuckyTickets - initialLuckyTickets
          } lucky tickets.`
        );

        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);

        const endTime = new Date();
        logger.error(
          {
            userId,
            timestamp: endTime.toISOString(),
            initialCoins,
            finalCoins: "N/A",
            initialLuckyTickets,
            finalLuckyTickets: "N/A",
            boostersApplied: "N/A",
            success: false,
            specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
            skuRedeemed: "N/A",
            displayNameRedeemed: "N/A",
            guildId,
            duration: endTime.getTime() - startTime.getTime(),
            error: (error as Error).message,
            message: "Redemption operation failed."
          },
          `Redemption operation failed for user ${userId}.`
        );

        throw error;
      } finally {
        span.end();
      }
    });
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
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildRedeemCoinsMessage", async (span) => {
    try {
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
          .setDescription(
            "It looks like you haven't made any purchases yet. Check out the shop for some festive items! 🎄"
          )
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
        span.setStatus({ code: SpanStatusCode.OK });
        return message;
      }

      let totalCoins = 0;
      let totalLuckyTickets = 0;
      const boostersToApply: BoosterName[] = [];

      for (const entitlement of consumableEntitlements) {
        const reward = SKU_REWARDS[entitlement.sku_id as SKU];
        if (!reward) {
          logger.error(`No reward found for SKU ${entitlement.sku_id}`);
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
          Metrics.recordShopPurchaseMetric(
            entitlement.sku_id,
            reward.displayName,
            userId,
            ctx.interaction.guild_id ?? ctx.game?.id
          );
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

      span.setStatus({ code: SpanStatusCode.OK });

      // Log the redemption details
      logger.info(
        {
          userId,
          timestamp: new Date().toISOString(),
          initialCoins: "N/A",
          finalCoins: totalCoins,
          initialLuckyTickets: "N/A",
          finalLuckyTickets: totalLuckyTickets,
          boostersApplied: boostersToApply,
          success: true,
          specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
          skuRedeemed: consumableEntitlements.map((entitlement) => entitlement.sku_id).join(", "),
          displayNameRedeemed: consumableEntitlements
            .map((entitlement) => SKU_REWARDS[entitlement.sku_id as SKU]?.displayName)
            .join(", "),
          guildId: ctx.interaction.guild_id ?? ctx.game?.id ?? "Unknown",
          message: "Redemption operation completed successfully."
        },
        `Redemption operation completed successfully for user ${userId} with ${totalCoins} coins and ${totalLuckyTickets} lucky tickets.`
      );

      return message.addComponents(actions);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);

      // Log the error details
      logger.error(
        {
          userId: ctx.user.id,
          timestamp: new Date().toISOString(),
          initialCoins: "N/A",
          finalCoins: "N/A",
          initialLuckyTickets: "N/A",
          finalLuckyTickets: "N/A",
          boostersApplied: "N/A",
          success: false,
          specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
          skuRedeemed: "N/A",
          displayNameRedeemed: "N/A",
          guildId: ctx.interaction.guild_id ?? ctx.game?.id ?? "Unknown",
          error: (error as Error).message,
          message: "Redemption operation failed."
        },
        `Redemption operation failed for user ${ctx.user.id}.`
      );

      throw error;
    } finally {
      span.end();
    }
  });
}
