import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  Button,
  ButtonBuilder,
  ButtonContext,
  ActionRowBuilder
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";

const GRACE_PERIOD_DAYS = 1;
const PREMIUM_GRACE_PERIOD_DAYS = 3;
const BASE_REWARD = 10;
const PREMIUM_BASE_REWARD = 15;
const MAX_STREAK_DAYS = 30;
const SECONDS_IN_A_DAY = 60 * 24;
const MILLISECONDS_IN_A_SECOND = 1000;

export class DailyReward implements ISlashCommand {
  public builder = new SlashCommandBuilder("dailyreward", "Claim your daily coin reward.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildDailyRewardMessage(ctx));
  };

  public components = [
    new Button(
      "dailyreward.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await buildDailyRewardMessage(ctx));
      }
    )
  ];
}

async function buildDailyRewardMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wallet = await WalletHelper.getWallet(userId);

  const currentDate = new Date();
  const lastClaimDate = wallet.lastClaimDate ? new Date(wallet.lastClaimDate) : null;
  const isPremium = ctx.game?.hasAiAccess ?? false;
  const gracePeriod = isPremium ? PREMIUM_GRACE_PERIOD_DAYS : GRACE_PERIOD_DAYS;
  const baseReward = isPremium ? PREMIUM_BASE_REWARD : BASE_REWARD;

  if (lastClaimDate && isSameDay(currentDate, lastClaimDate)) {
    return SimpleError(
      `You have already claimed your daily reward. You can claim it again <t:${Math.floor(
        lastClaimDate.getTime() / MILLISECONDS_IN_A_SECOND + SECONDS_IN_A_DAY
      )}:R>.`
    );
  }

  const daysSinceLastClaim = lastClaimDate ? getDaysDifference(currentDate, lastClaimDate) : null;
  if (daysSinceLastClaim && daysSinceLastClaim > gracePeriod) {
    wallet.streak = 1;
  } else if (daysSinceLastClaim) {
    wallet.streak++;
  } else {
    wallet.streak = 1;
  }

  const streakMultiplier = Math.min(wallet.streak, MAX_STREAK_DAYS);
  const reward = baseReward * streakMultiplier;

  wallet.coins += reward;
  wallet.lastClaimDate = currentDate;
  await wallet.save();

  const embed = new EmbedBuilder()
    .setTitle("Daily Reward")
    .setDescription(
      `<@${ctx.user.id}> You have claimed your daily reward of ${reward} coins.\n\nCurrent Streak: ${
        wallet.streak
      } days.\n\n${
        isPremium
          ? "As a premium user, you receive more coins and have a longer grace period!"
          : "Subscribe to Festive Forest to receive more coins and a longer grace period! Click on the bot avatar to open the [store](https://discord.com/application-directory/1050722873569968128/store)."
      }`
    )
    .setFooter({ text: "🔥 Claim your daily reward once every 24 hours." });

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("dailyreward.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
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