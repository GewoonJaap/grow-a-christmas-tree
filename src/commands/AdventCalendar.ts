import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { AdventCalendarHelper } from "../util/adventCalendar/AdventCalendarHelper";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { getLocaleFromTimezone } from "../util/timezones";
import { AdventCalendar } from "../models/AdventCalendar";
import { Achievement } from "../models/Achievement";

export class AdventCalendar implements ISlashCommand {
  public builder = new SlashCommandBuilder("adventcalendar", "Open your daily advent calendar present!");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
      return await ctx.reply(BanHelper.getBanEmbed(ctx.user.username));
    }

    const userId = ctx.user.id;
    const guildId = ctx.interaction.guild_id;
    const currentDate = new Date();
    const userTimeZone = await AdventCalendarHelper.getUserTimeZone(userId, guildId);
    const userLocale = getLocaleFromTimezone(userTimeZone);

    const hasOpenedPresent = await AdventCalendarHelper.hasOpenedPresent(userId, currentDate, userTimeZone);

    if (hasOpenedPresent) {
      const nextOpenDate = AdventCalendarHelper.getNextOpenDate(currentDate, userTimeZone);
      const embed = new EmbedBuilder()
        .setTitle("Advent Calendar")
        .setDescription(
          `🎁 You have already opened your present for today. You can open your next present <t:${Math.floor(
            nextOpenDate.getTime() / 1000
          )}:R>.`
        )
        .setColor(0xff0000);

      return await ctx.reply(new MessageBuilder().addEmbed(embed));
    }

    const present = AdventCalendarHelper.getDailyPresent();
    await AdventCalendarHelper.saveUserPresent(userId, currentDate, present);

    const wallet = await WalletHelper.getWallet(userId);
    wallet.coins += present.coins;
    await wallet.save();

    const embed = new EmbedBuilder()
      .setTitle("Advent Calendar")
      .setDescription(
        `🎉 You have opened your advent calendar present and received ${present.coins} coins! Come back tomorrow for another present.`
      )
      .setColor(0x00ff00);

    // Check for achievements
    const achievements = await Achievement.find({ userId });
    const streakAchievement = achievements.find((achievement) => achievement.achievementName === "Daily Streak");

    if (!streakAchievement) {
      const newAchievement = new Achievement({
        userId,
        achievementName: "Daily Streak",
        description: "Opened a present for the first time",
        dateEarned: new Date(),
        badgeUrl: "https://example.com/badge.png"
      });
      await newAchievement.save();
    }

    return await ctx.reply(new MessageBuilder().addEmbed(embed));
  };

  public components = [];
}
