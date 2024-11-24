import { FlaggedUser } from "../../models/FlaggedUser";
import { BanHelper } from "../bans/BanHelper";
import { SlashCommandContext, ButtonContext } from "interactions.ts";
import { countExcessiveWateringEvents, EXCESSIVE_WATERING_THRESHOLD } from "./wateringEventHelper";
import { countFailedAttempts } from "./failedAttemptsHelper";
import { AUTOBAN_TIME, AUTOCLICKER_REFLAG_TIMEFRAME, AUTOCLICKER_THRESHOLD } from "./antiBotHelper";
import { UNLEASH_FEATURES, UnleashHelper } from "../unleash/UnleashHelper";

export const AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD = 5; //Number of flags last day to ban
export const AUTOCLICKER_FLAGGED_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours

export async function banAutoClicker(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  const userId = ctx.user.id;
  const guildId = ctx.game?.id;

  if (!(await BanHelper.isUserBanned(userId))) {
    console.log(`User ${userId} in guild ${guildId} banned for auto-clicking.`);
    const banReason = await getFlagReasons(ctx);
    BanHelper.banUser(userId, `Auto ban for: ${banReason.join(",")}`, AUTOBAN_TIME);
  }
}

export async function getFlagReasons(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<string[]> {
  const userId = ctx.user.id;
  const guildId = ctx.game?.id;
  const now = new Date();
  const startTime = new Date(now.getTime() - AUTOCLICKER_FLAGGED_TIMEFRAME);

  const flaggedReasons = await FlaggedUser.aggregate([
    {
      $match: {
        userId,
        guildId,
        timestamp: { $gte: startTime, $lte: now }
      }
    },
    {
      $group: {
        _id: null,
        reasons: { $addToSet: "$reason" }
      }
    },
    {
      $project: {
        _id: 0,
        reasons: 1
      }
    }
  ]);

  return flaggedReasons.length > 0 ? flaggedReasons[0].reasons : [];
}

export async function isUserFlagged(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<boolean> {
  const now = new Date();
  const startTime = new Date(now.getTime() - AUTOCLICKER_REFLAG_TIMEFRAME);
  const userId = ctx.user.id;
  const guildId = ctx.game?.id;
  const flaggedUser = await FlaggedUser.findOne({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  return !!flaggedUser;
}

export async function flagPotentialAutoClickers(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  const userId = ctx.user.id;
  const guildId = ctx.game?.id;
  const failedAttempts = await countFailedAttempts(ctx);
  const excessiveWatering = await countExcessiveWateringEvents(userId, guildId);
  if (
    failedAttempts >= AUTOCLICKER_THRESHOLD &&
    UnleashHelper.isEnabled(UNLEASH_FEATURES.antiAutoClickerLogging, ctx) &&
    UnleashHelper.isEnabled(UNLEASH_FEATURES.autoFailedAttemptsBan, ctx)
  ) {
    const isFlagged = await isUserFlagged(ctx);
    if (!isFlagged) {
      console.log(
        `User ${userId} in guild ${guildId} flagged as potential auto-clicker. User has ${failedAttempts} failed attempts, while only ${AUTOCLICKER_THRESHOLD} are allowed.`
      );
      const flaggedUser = new FlaggedUser({
        userId,
        guildId,
        reason: "Potential auto-clicker",
        timestamp: new Date()
      });
      await flaggedUser.save();
    }
  }

  if (
    excessiveWatering >= EXCESSIVE_WATERING_THRESHOLD &&
    UnleashHelper.isEnabled(UNLEASH_FEATURES.antiAutoClickerLogging, ctx) &&
    UnleashHelper.isEnabled(UNLEASH_FEATURES.autoExcessiveWateringBan, ctx)
  ) {
    const isFlagged = await isUserFlagged(ctx);
    if (!isFlagged) {
      console.log(
        `User ${userId} in guild ${guildId} flagged as potential auto-clicker. User has ${excessiveWatering} excessive watering events, while only ${EXCESSIVE_WATERING_THRESHOLD} are allowed.`
      );
      const flaggedUser = new FlaggedUser({
        userId,
        guildId,
        reason: "Excessive watering",
        timestamp: new Date()
      });
      await flaggedUser.save();
    }
  }

  const flaggedTimes = await countFlagsForUserLastDay(userId);
  if (
    flaggedTimes >= AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD &&
    UnleashHelper.isEnabled(UNLEASH_FEATURES.autoBan, ctx)
  ) {
    console.log(`User ${userId} in guild ${guildId} banned for auto-clicking.`);
    banAutoClicker(ctx);
  }
}

export async function countFlagsForUserLastDay(userId: string): Promise<number> {
  const now = new Date();
  const startTime = new Date(now.getTime() - AUTOCLICKER_FLAGGED_TIMEFRAME);

  const flaggedUsers = await FlaggedUser.find({
    userId,
    timestamp: { $gte: startTime, $lte: now }
  });

  return flaggedUsers.length;
}
