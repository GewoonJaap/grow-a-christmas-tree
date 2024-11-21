import { BannedUser, IBannedUser } from "../../models/BannedUser";

export class BanHelper {
  /**
   * Ban a user
   * @param userId - The ID of the user to ban
   * @param reason - The reason for the ban
   * @param duration - The duration of the ban in milliseconds. If null, the ban is permanent.
   */
  static async banUser(userId: string, reason: string, duration: number | null): Promise<void> {
    const timeStart = new Date();
    const timeEnd = duration ? new Date(timeStart.getTime() + duration) : null;

    await BannedUser.updateOne(
      { userId, $or: [{ timeEnd: { $gte: timeStart } }, { timeEnd: null }] },
      { $set: { reason, timeStart, timeEnd } },
      { upsert: true }
    );

    console.log(`User ${userId} has been banned for reason: ${reason}`);
  }

  static async getUserBan(userId: string): Promise<IBannedUser | null> {
    const now = new Date();
    return BannedUser.findOne({
      userId,
      $or: [
        { timeEnd: { $gte: now } }, // Ban is still active
        { timeEnd: null } // Permanent ban
      ]
    });
  }

  /**
   * Check if a user is currently banned
   * @param userId - The ID of the user to check
   * @returns A boolean indicating if the user is banned
   */
  static async isUserBanned(userId: string): Promise<boolean> {
    const now = new Date();

    const bannedUser = await BannedUser.findOne({
      userId,
      $or: [
        { timeEnd: { $gte: now } }, // Ban is still active
        { timeEnd: null } // Permanent ban
      ]
    });

    return !!bannedUser;
  }

  /**
   * Unban a user
   * @param userId - The ID of the user to unban
   */
  static async unbanUser(userId: string): Promise<void> {
    const now = new Date();
    await BannedUser.updateOne(
      { userId, $or: [{ timeEnd: { $gte: now } }, { timeEnd: null }] },
      { $set: { timeEnd: now } }
    );
    console.log(`User ${userId} has been unbanned.`);
  }
}
