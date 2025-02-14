import { IAchievement, Achievement } from "../../models/Achievement";

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
}
