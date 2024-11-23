import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { FailedAttempt } from "../../models/FailedAttempt";
import { FlaggedUser } from "../../models/FlaggedUser";
import { UnleashHelper } from "../unleash/UnleashHelper";
import { BanHelper } from "../bans/BanHelper";
import { WateringEvent } from "../../models/WateringEvent";

const AUTOCLICKER_THRESHOLD = 15;
const AUTOCLICKER_TIMEFRAME = 1000 * 60 * 60; // 1 hour
const AUTOCLICKER_FLAGGED_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours
const AUTOCLICKER_REFLAG_TIMEFRAME = 1000 * 60 * 60 * 1; // 1 hour to reflag after being flagged
const UNLEASH_AUTOCLICKER_FLAGGING = "anti-auto-clicker-logging";
const UNLEASH_AUTOCLICKER_AUTOBAN = "auto-ban";
const AUTOBAN_TIME = 1000 * 60 * 60 * 24 * 7; // 7 day

const AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD = 3; //Number of flags last day to ban

const EXCESSIVE_WATERING_THRESHOLD = 16; // Threshold for excessive watering events in a day, if you water more than 16 different hours in a day you get flagged
const WATERING_EVENT_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours

export async function banAutoClicker(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  if (
    UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx) &&
    UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_AUTOBAN, ctx)
  ) {
    const userId = ctx.user.id;
    const guildId = ctx.game?.id;
    const flaggedUser = await countFlagsForUserLastDay(userId);

    if (flaggedUser >= AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD && !(await BanHelper.isUserBanned(userId))) {
      console.log(`User ${userId} in guild ${guildId} banned for auto-clicking.`);
      BanHelper.banUser(userId, "Auto-clicking", AUTOBAN_TIME);
    }
  }
}

export async function countFailedAttempts(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<number> {
  if (UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx)) {
    const now = new Date();
    const startTime = new Date(now.getTime() - AUTOCLICKER_TIMEFRAME);
    const userId = ctx.user.id;
    const guildId = ctx.game?.id;

    const failedAttempts = await FailedAttempt.countDocuments({
      userId,
      guildId,
      timestamp: { $gte: startTime, $lte: now }
    });

    return failedAttempts;
  }
  return 0;
}

export async function isUserFlagged(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<boolean> {
  if (UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx)) {
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
  return false;
}

export async function flagPotentialAutoClickers(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  if (UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx)) {
    const userId = ctx.user.id;
    const guildId = ctx.game?.id;
    const failedAttempts = await countFailedAttempts(ctx);
    const excessiveWatering = await countExcessiveWateringEvents(userId, guildId);
    if (failedAttempts >= AUTOCLICKER_THRESHOLD) {
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

    if (excessiveWatering) {
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
    if (flaggedTimes >= AUTOCLICKER_THRESHOLD) {
      console.log(`User ${userId} in guild ${guildId} banned for auto-clicking.`);
      banAutoClicker(ctx);
    }
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

export async function saveFailedAttempt(
  ctx: SlashCommandContext | ButtonContext<unknown>,
  attemptType: string,
  failureReason: string
): Promise<void> {
  if (UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx)) {
    const userId = ctx.user.id;
    const guildId = ctx.game?.id;
    const failedAttempt = new FailedAttempt({
      userId,
      guildId,
      attemptType,
      failureReason
    });

    await failedAttempt.save();
  }
}

export async function cleanOldFailedAttempts(): Promise<void> {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - AUTOCLICKER_TIMEFRAME);

  await FailedAttempt.deleteMany({
    timestamp: { $lt: cutoffTime }
  });

  console.log("Old failed attempts cleaned up.");
}

export async function countExcessiveWateringEvents(userId: string, guildId: string): Promise<boolean> {
  const now = new Date();
  const startTime = new Date(now.getTime() - WATERING_EVENT_TIMEFRAME);

  const wateringEvents = await WateringEvent.find({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  const hours = new Set<number>();

  wateringEvents.forEach((event) => {
    const eventHour = event.timestamp.getUTCHours();
    hours.add(eventHour);
  });

  return hours.size >= EXCESSIVE_WATERING_THRESHOLD;
}
