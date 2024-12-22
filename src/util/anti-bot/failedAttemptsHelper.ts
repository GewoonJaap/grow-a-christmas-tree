import { FailedAttempt } from "../../models/FailedAttempt";
import { SlashCommandContext, ButtonContext } from "interactions.ts";
import { logger } from "../../tracing/pinoLogger";

export const AUTOCLICKER_TIMEFRAME = 1000 * 60 * 60; // 1 hour

export async function countFailedAttempts(ctx: SlashCommandContext | ButtonContext<unknown>): Promise<number> {
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

export async function saveFailedAttempt(
  ctx: SlashCommandContext | ButtonContext<unknown>,
  attemptType: string,
  failureReason: string
): Promise<void> {
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

export async function cleanOldFailedAttempts(): Promise<void> {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - AUTOCLICKER_TIMEFRAME);

  await FailedAttempt.deleteMany({
    timestamp: { $lt: cutoffTime }
  });

  logger.info("Old failed attempts cleaned up.");
}
