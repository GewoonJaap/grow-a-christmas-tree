import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { IAdventCalendar, AdventCalendar } from "../../models/AdventCalendar";
import { WalletHelper } from "../wallet/WalletHelper";
import { WheelStateHelper } from "../wheel/WheelStateHelper";
import { AchievementHelper } from "../achievement/AchievementHelper";

const SECONDS_IN_A_DAY = 60 * 60 * 24;
const MILLISECONDS_IN_A_SECOND = 1000;

type PresentType = "coins" | "tickets" | "treeSize";

export interface Present {
  displayName: string;
  probability: number;
}

const PRESENTS: Record<PresentType, Present> = {
  coins: { displayName: "Coins", probability: 0.5 },
  tickets: { displayName: "Tickets", probability: 0.3 },
  treeSize: { displayName: "Tree Size Increase", probability: 0.2 }
};

export class AdventCalendarHelper {
  static async getAdventCalendar(
    userId: string,
    year: number = new Date().getFullYear()
  ): Promise<InstanceType<typeof AdventCalendar>> {
    const adventCalendar = await AdventCalendar.findOne({ userId: userId, year: year });
    if (!adventCalendar) {
      return await AdventCalendar.create(AdventCalendarHelper.getDefaultAdventCalendar(userId, year));
    }
    return adventCalendar;
  }

  static async getAdventCalendars(
    userIds: string[],
    year: number = new Date().getFullYear()
  ): Promise<Map<string, InstanceType<typeof AdventCalendar>>> {
    const adventCalendars = await AdventCalendar.find({ userId: { $in: userIds }, year: year });
    const adventCalendarMap = new Map<string, InstanceType<typeof AdventCalendar>>();

    // Add existing advent calendars to the map
    adventCalendars.forEach((adventCalendar) => {
      adventCalendarMap.set(adventCalendar.userId, adventCalendar);
    });

    // Create missing advent calendars and add them to the map
    const missingUserIds = userIds.filter((userId) => !adventCalendarMap.has(userId));
    const newAdventCalendars = await AdventCalendar.insertMany(
      missingUserIds.map((userId) => AdventCalendarHelper.getDefaultAdventCalendar(userId, year))
    );

    newAdventCalendars.forEach((adventCalendar) => {
      adventCalendarMap.set(adventCalendar.userId, adventCalendar);
    });

    return adventCalendarMap;
  }

  static getDefaultAdventCalendar(userId: string, year: number): IAdventCalendar {
    return { userId: userId, claimDates: [], year: year };
  }

  static async addClaimedDay(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    year: number = new Date().getFullYear()
  ): Promise<{ type: PresentType; amount?: number } | null> {
    const adventCalendar = await AdventCalendarHelper.getAdventCalendar(ctx.user.id, year);
    const today = new Date();
    const alreadyClaimed = adventCalendar.claimDates.some((date) => date.toDateString() === today.toDateString());

    if (!alreadyClaimed) {
      adventCalendar.claimDates.push(today);
      await adventCalendar.save();
      const present = AdventCalendarHelper.determinePresent(ctx);
      await AdventCalendarHelper.applyPresent(ctx, present);

      AchievementHelper.grantAchievement(ctx.user.id, "Advent Calendar 2024 Participation");

      if (adventCalendar.claimDates.length === 25) {
        AchievementHelper.grantAchievement(ctx.user.id, "Advent Calendar Completion");
      }

      return present;
    }
    return null;
  }

  static async getClaimedDays(userId: string, year: number = new Date().getFullYear()): Promise<Date[]> {
    const adventCalendar = await AdventCalendarHelper.getAdventCalendar(userId, year);
    return adventCalendar.claimDates;
  }

  static async hasClaimedToday(userId: string, year: number = new Date().getFullYear()): Promise<boolean> {
    const adventCalendar = await AdventCalendarHelper.getAdventCalendar(userId, year);
    const today = new Date();
    return adventCalendar.claimDates.some((date) => date.toDateString() === today.toDateString());
  }

  static getNextClaimDay(claimDate: Date): Date {
    const nextDay = new Date(claimDate.getTime() + SECONDS_IN_A_DAY * MILLISECONDS_IN_A_SECOND);
    console.log(nextDay, nextDay.getTime());
    return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0);
  }

  static async getLastClaimDay(userId: string, year: number = new Date().getFullYear()): Promise<Date | null> {
    const adventCalendar = await AdventCalendarHelper.getAdventCalendar(userId, year);
    return adventCalendar.claimDates[adventCalendar.claimDates.length - 1] || null;
  }

  static determinePresent(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): {
    type: PresentType;
    amount?: number;
  } {
    const random = Math.random();
    let cumulativeProbability = 0;
    const isPremium = ctx.game?.hasAiAccess ?? false;

    for (const [present, { probability }] of Object.entries(PRESENTS) as [PresentType, Present][]) {
      cumulativeProbability += probability;
      if (random < cumulativeProbability) {
        if (present === "coins") {
          return { type: present, amount: Math.floor(Math.random() * (isPremium ? 100 : 50)) + 1 }; // Random amount of coins between 1 and 100
        } else if (present === "tickets") {
          return { type: present, amount: Math.floor(Math.random() * (isPremium ? 10 : 5)) + 1 }; // Random amount of tickets between 1 and 5
        } else if (present === "treeSize") {
          return { type: present, amount: Math.floor(Math.random() * (isPremium ? 10 : 5)) + 1 }; // Random 1 or 2 ft
        }
        return { type: present };
      }
    }

    return { type: "coins", amount: 10 };
  }

  static async applyPresent(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    present: { type: PresentType; amount?: number }
  ): Promise<void> {
    switch (present.type) {
      case "coins":
        if (present.amount) {
          await WalletHelper.addCoins(ctx.user.id, present.amount);
        }
        break;
      case "tickets":
        if (present.amount) {
          await WheelStateHelper.addTickets(ctx.user.id, present.amount);
        }
        break;
      case "treeSize":
        if (present.amount && ctx.game) {
          ctx.game.size += present.amount;
          await ctx.game.save();
        }
        break;
      default:
        break;
    }
  }
}