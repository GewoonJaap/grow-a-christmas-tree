import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { FailedAttempt } from "../../models/FailedAttempt";
import { FlaggedUser } from "../../models/FlaggedUser";
import { UnleashHelper } from "../unleash/UnleashHelper";
import { BanHelper } from "../bans/BanHelper";

const AUTOCLICKER_THRESHOLD = 15;
const AUTOCLICKER_TIMEFRAME = 1000 * 60 * 60; // 1 hour
const AUTOCLICKER_FLAGGED_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours
const UNLEASH_AUTOCLICKER_FLAGGING = "anti-auto-clicker-logging";
const UNLEASH_AUTOCLICKER_AUTOBAN = "auto-ban";
const AUTOBAN_TIME = 1000 * 60 * 60 * 24 * 1; // 1 days

const AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD = AUTOCLICKER_THRESHOLD * 2;

export async function banAutoClicker(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<void> {
  if (
    UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_FLAGGING, ctx) &&
    UnleashHelper.isEnabled(UNLEASH_AUTOCLICKER_AUTOBAN, ctx)
  ) {
    const userId = ctx.user.id;
    const guildId = ctx.game?.id;
    const flaggedUser = await FlaggedUser.findOne({
      userId,
      guildId
    });

    if (
      flaggedUser &&
      (await countFailedAttempts(ctx)) > AUTOCLICKER_FAILED_ATTEMPTS_BAN_THRESHOLD &&
      !(await BanHelper.isUserBanned(userId))
    ) {
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
    const startTime = new Date(now.getTime() - AUTOCLICKER_FLAGGED_TIMEFRAME);
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
    if (failedAttempts > AUTOCLICKER_THRESHOLD) {
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
        // Add your logic to handle flagged users here, such as logging or applying penalties.
      }
    }
  }
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
