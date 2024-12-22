import { EmbedBuilder, MessageBuilder } from "interactions.ts";
import { BannedUser, IBannedUser } from "../../models/BannedUser";
import { getRandomElement } from "../helpers/arrayHelper";
import { CHEATER_CLOWN_EMOJI, SUPPORT_SERVER_INVITE } from "../const";
import pino from "pino";

const logger = pino({
  level: "info"
});

const BAN_IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/banned/ban-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/banned/ban-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/banned/ban-3.jpg"
];
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

    logger.info(`User ${userId} has been banned for reason: ${reason}`);
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
   * Check if a list of users are currently banned
   * @param userIds - The IDs of the users to check
   * @returns An array of banned user IDs
   */
  static async areUsersBanned(userIds: string[]): Promise<string[]> {
    const now = new Date();
    const bannedUsers = await BannedUser.find({
      userId: { $in: userIds },
      $or: [
        { timeEnd: { $gte: now } }, // Ban is still active
        { timeEnd: null } // Permanent ban
      ]
    });

    return bannedUsers.map((bannedUser) => bannedUser.userId);
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
    logger.info(`User ${userId} has been unbanned.`);
  }

  static getBanEmbed(username: string): MessageBuilder {
    const embed = new EmbedBuilder()
      .setImage(getRandomElement(BAN_IMAGES) ?? BAN_IMAGES[0])
      .setTitle(`${CHEATER_CLOWN_EMOJI} Oops! ${username} you're on Santa's Naughty List!`)
      .setDescription(
        `It seems you've been banned and Santa's workshop is off-limits for now. Don't worry, even the naughtiest elves can make amends! Reach out to [support](${SUPPORT_SERVER_INVITE}), and let's see if we can bring back the holiday cheer! 🎁✨`
      )
      .setURL(SUPPORT_SERVER_INVITE)
      .setColor(0xff0000)
      .setFooter({ text: "If you believe this is a mistake, please join our support server." });
    return new MessageBuilder().addEmbed(embed).setEphemeral(true).setComponents([]);
  }
}
