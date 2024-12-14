import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  Button,
  ButtonBuilder,
  ButtonContext,
  ActionRowBuilder
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { MessageUpsellType } from "../util/types/MessageUpsellType";
import { PremiumButtonBuilder, SKU } from "../util/discord/DiscordApiExtensions";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { WheelStateHelper } from "../util/wheel/WheelStateHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";

const GRACE_PERIOD_DAYS = 1;
const PREMIUM_GRACE_PERIOD_DAYS = 3;
const BASE_REWARD = 10;
const PREMIUM_BASE_REWARD = 15;
const MAX_STREAK_DAYS = 30;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
const MILLISECONDS_IN_A_SECOND = 1000;

export class DailyReward implements ISlashCommand {
  public builder = new SlashCommandBuilder("dailyreward", "Claim your daily coin reward.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await ctx.reply(BanHelper.getBanEmbed(ctx.user.username));
    }
    return await ctx.reply(await buildDailyRewardMessage(ctx));
  };

  public components = [
    new Button(
      "dailyreward.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildDailyRewardMessage(ctx));
      }
    )
  ];
}

function upsellText(hasPremium: boolean): MessageUpsellType {
  const random = Math.random();
  if (random > 0.5 && !hasPremium) {
    return {
      message:
        "🔥 Did you know that with the Festive Forest subscription you can get more coins each day and a longer grace period?",
      isUpsell: true,
      buttonSku: SKU.FESTIVE_ENTITLEMENT
    };
  }
  return {
    message: "🔥 Claim your daily reward once every 24 hours.",
    isUpsell: false
  };
}

async function buildDailyRewardMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wallet = await WalletHelper.getWallet(userId);

  const currentDate = new Date();
  const lastClaimDate = wallet.lastClaimDate ? new Date(wallet.lastClaimDate) : null;
  const isPremium = ctx.game?.hasAiAccess ?? false;
  const gracePeriod = isPremium ? PREMIUM_GRACE_PERIOD_DAYS : GRACE_PERIOD_DAYS;
  const baseReward = isPremium ? PREMIUM_BASE_REWARD : BASE_REWARD;

  const upsellData = upsellText(isPremium);

  if (lastClaimDate && isSameDay(currentDate, lastClaimDate)) {
    const embed = new EmbedBuilder()
      .setTitle("Daily Reward")
      .setDescription(
        `<@${ctx.user.id}> You have already claimed your daily reward. You can claim it again <t:${getNextClaimDayEpoch(
          lastClaimDate
        )}:R>.`
      )
      .setColor(0xff0000)
      .setFooter({ text: upsellData.message });

    const message = new MessageBuilder().addEmbed(embed);
    const actions = new ActionRowBuilder();
    if (upsellData.isUpsell && upsellData.buttonSku && !process.env.DEV_MODE) {
      actions.addComponents(new PremiumButtonBuilder().setSkuId(upsellData.buttonSku));
    }
    actions.addComponents(await ctx.manager.components.createInstance("dailyreward.refresh"));
    message.addComponents(actions);
    return message;
  }

  const daysSinceLastClaim = lastClaimDate ? getDaysDifference(currentDate, lastClaimDate) : null;
  if (daysSinceLastClaim && daysSinceLastClaim > gracePeriod) {
    wallet.streak = 1;
  } else if (daysSinceLastClaim) {
    wallet.streak++;
  } else {
    wallet.streak = 1;
  }

  const isSpecialDay = SpecialDayHelper.isChristmas() || SpecialDayHelper.isNewYearsEve();
  const baseRewardMultiplier = isSpecialDay ? 2 : 1;
  const streakMultiplier = Math.min(wallet.streak, MAX_STREAK_DAYS);
  const reward = baseReward * streakMultiplier * baseRewardMultiplier;

  wallet.coins += reward;
  wallet.lastClaimDate = currentDate;
  await wallet.save();

  // Add tickets when the user claims their daily reward
  const claimedTickets = isPremium ? 2 : 1;
  await WheelStateHelper.addTickets(userId, claimedTickets);

  const embed = new EmbedBuilder()
    .setTitle("🎁 Daily Reward")
    .setDescription(
      `<@${
        ctx.user.id
      }> You have claimed your daily reward of ${reward} coins.\n🎟️ You also gained ${claimedTickets} ticket${
        claimedTickets === 1 ? "" : "s"
      } for the wheel of fortune!\n\nCurrent Streak: ${wallet.streak} day${wallet.streak === 1 ? "" : "s"}.\n\n${
        isPremium
          ? `As a premium user, you receive more coins and have a ${PREMIUM_GRACE_PERIOD_DAYS} day grace period!`
          : `Subscribe to Festive Forest to receive more coins and a ${PREMIUM_GRACE_PERIOD_DAYS} day grace period! Click on the bot avatar to open the [store](https://discord.com/application-directory/1050722873569968128/store).`
      }\nYou can claim it again <t:${getNextClaimDayEpoch(currentDate)}:R>.`
    )
    .setFooter({ text: upsellData.message });

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("dailyreward.refresh")
  );

  if (upsellData.isUpsell && upsellData.buttonSku && !process.env.DEV_MODE) {
    actionRow.addComponents(new PremiumButtonBuilder().setSkuId(upsellData.buttonSku));
  }

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

function getNextClaimDayEpoch(claimDate: Date): number {
  const nextDay = new Date(claimDate.getTime() + SECONDS_IN_A_DAY * MILLISECONDS_IN_A_SECOND);
  return Math.floor(
    new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0).getTime() / MILLISECONDS_IN_A_SECOND
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
