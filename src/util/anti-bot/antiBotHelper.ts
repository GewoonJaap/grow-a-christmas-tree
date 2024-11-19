import { FailedAttempt } from "../../models/FailedAttempt";
import { FlaggedUser } from "../../models/FlaggedUser";

const AUTOCLICKER_THRESHOLD = 15;
const AUTOCLICKER_TIMEFRAME = 1000 * 60 * 60; // 1 hour

export async function countFailedAttempts(userId: string, guildId: string): Promise<number> {
  const now = new Date();
  const startTime = new Date(now.getTime() - AUTOCLICKER_TIMEFRAME);

  const failedAttempts = await FailedAttempt.countDocuments({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  return failedAttempts;
}

export async function isUserFlagged(userId: string, guildId: string): Promise<boolean> {
  const now = new Date();
  const startTime = new Date(now.getTime() - AUTOCLICKER_TIMEFRAME);

  const flaggedUser = await FlaggedUser.findOne({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  return !!flaggedUser;
}

export async function flagPotentialAutoClickers(userId: string, guildId?: string): Promise<void> {
  if (!guildId) return;
  const failedAttempts = await countFailedAttempts(userId, guildId);

  if (failedAttempts > AUTOCLICKER_THRESHOLD) {
    const isFlagged = await isUserFlagged(userId, guildId);

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

export async function saveFailedAttempt(
  userId: string,
  guildId: string,
  attemptType: string,
  failureReason: string
): Promise<void> {
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

  console.log("Old failed attempts cleaned up.");
}
