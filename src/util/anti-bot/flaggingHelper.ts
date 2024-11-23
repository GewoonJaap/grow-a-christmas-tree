import { FlaggedUser } from "../../models/FlaggedUser";
import { BanHelper } from "../bans/BanHelper";
import { SlashCommandContext, ButtonContext } from "interactions.ts";
import { countExcessiveWateringEvents } from "./wateringEventHelper";
import { countFailedAttempts } from "./failedAttemptsHelper";
import { AUTOBAN_TIME, AUTOCLICKER_REFLAG_TIMEFRAME, AUTOCLICKER_THRESHOLD } from "./antiBotHelper";
import { UNLEASH_FEATURES, UnleashHelper } from "../unleash/UnleashHelper";

export const AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD = 3; //Number of flags last day to ban
export const AUTOCLICKER_FLAGGED_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours

export async function banAutoClicker(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  const userId = ctx.user.id;
  const guildId = ctx.game?.id;

  if (!(await BanHelper.isUserBanned(userId))) {
    console.log(`User ${userId} in guild ${guildId} banned for auto-clicking.`);
    BanHelper.banUser(userId, "Auto-clicking", AUTOBAN_TIME);
  }
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
    UnleashHelper.isEnabled(
      UNLEASH_FEATURES.antiAutoClickerLogging.name,
      ctx,
      UNLEASH_FEATURES.antiAutoClickerLogging.fallbackValue
    )
  ) {
    const isFlagged = await isUserFlagged(ctx);
    if (!isFlagged) {
      console.log(`User ${userId} in guild ${guildId} flagged as potential auto-clicker.`);
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
    excessiveWatering &&
    UnleashHelper.isEnabled(
      UNLEASH_FEATURES.antiAutoClickerLogging.name,
      ctx,
      UNLEASH_FEATURES.antiAutoClickerLogging.fallbackValue
    )
  ) {
    const isFlagged = await isUserFlagged(ctx);
    if (!isFlagged) {
      console.log(`User ${userId} in guild ${guildId} flagged as potential auto-clicker.`);
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
    UnleashHelper.isEnabled(UNLEASH_FEATURES.autoBan.name, ctx, UNLEASH_FEATURES.autoBan.fallbackValue)
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
