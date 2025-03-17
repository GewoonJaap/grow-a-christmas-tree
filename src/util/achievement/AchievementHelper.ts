import { IAchievement, Achievement } from "../../models/Achievement";
import { SpecialDayHelper } from "../special-days/SpecialDayHelper";

interface AchievementConfig {
  name: string;
  description: string;
  emoji: string;
}

const ACHIEVEMENTS: Record<string, AchievementConfig> = {
  "Daily Streak": {
    name: "Daily Streak",
    description: "Opened a present for the first time",
    emoji: "🎁"
  },
  "Coin Collector": {
    name: "Coin Collector",
    description: "Collected 1000 coins",
    emoji: "💰"
  },
  "Ticket Master": {
    name: "Ticket Master",
    description: "Collected 50 tickets",
    emoji: "🎟️"
  },
  "Advent Calendar Completion": {
    name: "Advent Calendar Completion",
    description: "Opened all presents in the advent calendar",
    emoji: "🎄"
  },
  "Wheel of Fortune Winner": {
    name: "Wheel of Fortune Winner",
    description: "Won a prize on the wheel of fortune",
    emoji: "🎡"
  },
  "Tree Waterer": {
    name: "Tree Waterer",
    description: "Watered the tree for the first time",
    emoji: "🌲"
  },
  "Advent Calendar 2024 Participation": {
    name: "Advent Calendar 2024 Participation",
    description: "Participated in the 2024 advent calendar",
    emoji: "🎅"
  },
  "Christmas Day Celebration": {
    name: "Christmas Day Celebration",
    description: "Opened the advent calendar on Christmas day",
    emoji: "🎁"
  },
  "Cupid's Arrow": {
    name: "Cupid's Arrow",
    description: "Gave the tree some love on Valentine's day",
    emoji: "💘"
  },
  "St. Patrick's Day Celebration": {
    name: "St. Patrick's Day Celebration",
    description: "Celebrated St. Patrick's Day with the tree",
    emoji: "🍀"
  },
  "Easter Egg Hunt": {
    name: "Easter Egg Hunt",
    description: "Participated in the Easter celebration",
    emoji: "🥚"
  },
  "April Fool's Prankster": {
    name: "April Fool's Prankster",
    description: "Had fun on April Fool's Day",
    emoji: "🤡"
  },
  "Thanksgiving Feast": {
    name: "Thanksgiving Feast",
    description: "Gave thanks on Thanksgiving Day",
    emoji: "🦃"
  },
  "Black Friday Shopper": {
    name: "Black Friday Shopper",
    description: "Took advantage of Black Friday deals",
    emoji: "🛍️"
  },
  "Halloween Spooktacular": {
    name: "Halloween Spooktacular",
    description: "Celebrated Halloween with the tree",
    emoji: "🎃"
  },
  "New Year's Eve Party": {
    name: "New Year's Eve Party",
    description: "Rang in the New Year with the tree",
    emoji: "🎉"
  }
};

export type AchievementName = keyof typeof ACHIEVEMENTS;

export class AchievementHelper {
  static async grantAchievement(userId: string, achievementName: AchievementName): Promise<void> {
    const achievementConfig = ACHIEVEMENTS[achievementName];
    if (!achievementConfig) {
      throw new Error(`Achievement ${achievementName} not found`);
    }

    const existingAchievement = await AchievementHelper.hasAchievement(userId, achievementName);
    if (existingAchievement) {
      return; // User already has this achievement
    }

    const newAchievement = new Achievement({
      userId,
      achievementName: achievementConfig.name,
      description: achievementConfig.description,
      dateEarned: new Date(),
      emoji: achievementConfig.emoji
    });

    await newAchievement.save();
  }

  static async hasAchievement(userId: string, achievementName: AchievementName): Promise<boolean> {
    const achievement = await Achievement.findOne({ userId, achievementName });
    return !!achievement;
  }

  static async getAchievements(userId: string): Promise<IAchievement[]> {
    return await Achievement.find({ userId });
  }

  static async grantSpecialDayAchievements(userId: string): Promise<void> {
    const specialDayAchievements: Array<[() => boolean, AchievementName]> = [
      [SpecialDayHelper.isValentinesDay, "Cupid's Arrow"],
      [SpecialDayHelper.isStPatricksDay, "St. Patrick's Day Celebration"],
      [SpecialDayHelper.isEaster, "Easter Egg Hunt"],
      [SpecialDayHelper.isAprilFoolsDay, "April Fool's Prankster"],
      [SpecialDayHelper.isThanksgiving, "Thanksgiving Feast"],
      [SpecialDayHelper.isBlackFriday, "Black Friday Shopper"],
      [SpecialDayHelper.isHalloween, "Halloween Spooktacular"],
      [SpecialDayHelper.isNewYearsEve, "New Year's Eve Party"],
      [SpecialDayHelper.isEarthDay, "Earth Day Champion"]
    ];

    // Filter the achievements that are valid for today
    const achievementsToGrant = specialDayAchievements
      .filter(([checkFunction]) => checkFunction.call(SpecialDayHelper))
      .map(([, achievementName]) => achievementName);

    // Grant all achievements concurrently
    await Promise.all(
      achievementsToGrant.map((achievementName) => AchievementHelper.grantAchievement(userId, achievementName))
    );
  }
}
