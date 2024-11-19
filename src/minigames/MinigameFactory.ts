import { ButtonContext } from "interactions.ts";
import { SantaPresentMinigame } from "./SantaPresentMinigame";
import { Minigame } from "../util/types/minigame/MinigameType";
import { HotCocoaMinigame } from "./HotCocoaMinigame";
import { GiftUnwrappingMinigame } from "./GiftUnwrappingMinigame";
import { SnowballFightMinigame } from "./SnowballFightMinigame";
import { GrinchHeistMinigame } from "./GrinchHeistMinigame";
import { HolidayCookieCountdownMinigame } from "./HolidayCookieCountdownMinigame";
import { TinselTwisterMinigame } from "./TinselTwisterMinigame";
import { CarolingChoirMinigame } from "./CarolingChoirMinigame";

import { FireworksShowMinigame } from "./specialDays/FireworksShowMinigame";
import { HeartCollectionMinigame } from "./specialDays/HeartCollectionMinigame";
import { PumpkinHuntMinigame } from "./specialDays/PumpkinHuntMinigame";
import { ThanksgivingFeastMinigame } from "./specialDays/ThanksgivingFeastMinigame";
import { StPatricksDayTreasureHuntMinigame } from "./specialDays/StPatricksDayTreasureHuntMinigame";
import { EarthDayCleanupMinigame } from "./specialDays/EarthDayCleanupMinigame";
import { getRandomElement } from "../util/helpers/arrayHelper";

import { WalletHelper } from "../util/wallet/WalletHelper";
import { FailedAttempt } from "../models/FailedAttempt";

export const minigameButtons = [
  ...SantaPresentMinigame.buttons,
  ...HotCocoaMinigame.buttons,
  ...GiftUnwrappingMinigame.buttons,
  ...SnowballFightMinigame.buttons,
  ...GrinchHeistMinigame.buttons,
  ...HolidayCookieCountdownMinigame.buttons,
  ...TinselTwisterMinigame.buttons,
  ...CarolingChoirMinigame.buttons,
  ...FireworksShowMinigame.buttons,
  ...EarthDayCleanupMinigame.buttons,
  ...HeartCollectionMinigame.buttons,
  ...PumpkinHuntMinigame.buttons,
  ...StPatricksDayTreasureHuntMinigame.buttons,
  ...ThanksgivingFeastMinigame.buttons
];

const minigames: Minigame[] = [
  new SantaPresentMinigame(),
  new HotCocoaMinigame(),
  new GiftUnwrappingMinigame(),
  new SnowballFightMinigame(),
  new GrinchHeistMinigame(),
  new HolidayCookieCountdownMinigame(),
  new TinselTwisterMinigame(),
  new CarolingChoirMinigame()
];

export async function startRandomMinigame(ctx: ButtonContext): Promise<boolean> {
  if (!ctx.game) throw new Error("Game data missing.");

  const specialDays = [
    {
      dateRange: [new Date(new Date().getFullYear(), 11, 31)],
      minigame: new FireworksShowMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 1, 14)],
      minigame: new HeartCollectionMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 9, 24), new Date(new Date().getFullYear(), 9, 31)],
      minigame: new PumpkinHuntMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 6, 4)],
      minigame: new FireworksShowMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 10, 22), new Date(new Date().getFullYear(), 10, 28)],
      minigame: new ThanksgivingFeastMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 2, 17)],
      minigame: new StPatricksDayTreasureHuntMinigame()
    },
    {
      dateRange: [new Date(new Date().getFullYear(), 3, 22)],
      minigame: new EarthDayCleanupMinigame()
    }
  ];

  const currentDate = new Date();
  const specialDayMinigames = specialDays
    .filter((specialDay) => {
      return specialDay.dateRange.some((date) => {
        return date.getDate() === currentDate.getDate() && date.getMonth() === currentDate.getMonth();
      });
    })
    .map((specialDay) => specialDay.minigame);

  let availableMinigames =
    ctx.game.hasAiAccess || process.env.DEV_MODE === "true"
      ? [...minigames]
      : [...minigames.filter((minigame) => !minigame.config.premiumGuildOnly)];

  availableMinigames = [...availableMinigames, ...specialDayMinigames];

  if (availableMinigames.length === 0) {
    return false;
  }

  if (specialDayMinigames.length > 0) {
    if (Math.random() < 0.3) {
      const selectedMinigame = getRandomElement(specialDayMinigames);
      if (selectedMinigame) {
        await selectedMinigame.start(ctx);
        return true;
      }
    }
  }
  const selectedMinigame = getRandomElement(availableMinigames);

  if (selectedMinigame) {
    await selectedMinigame.start(ctx);
    return true;
  }

  return false;
}

export function getPremiumUpsellMessage(ctx: ButtonContext, textSuffix = "\n", appearAlways = false): string {
  const shouldAppear = appearAlways || Math.random() < 0.4;
  if (!ctx.game?.hasAiAccess && shouldAppear) {
    return `${textSuffix}You have just discovered a **premium** feature! Subscribe in the [store](https://discord.com/application-directory/1050722873569968128/store) to enjoy more fun minigames!`;
  }
  return "";
}

export async function handleMinigameCoins(
  ctx: ButtonContext,
  success: boolean,
  difficulty: number,
  maxDuration: number
): Promise<void> {
  if (!ctx.game) throw new Error("Game data missing.");

  const baseCoins = success ? 20 : -5;
  const difficultyBonus = difficulty * (success ? 1 : -1);
  const timeBonus = 0;
  const premiumBonus = ctx.game.hasAiAccess ? 15 : 0;
  const ramdomBonus = Math.floor(Math.random() * 10);

  const totalCoins = Math.abs(baseCoins + difficultyBonus + timeBonus + premiumBonus + ramdomBonus);

  if (totalCoins > 0) {
    await WalletHelper.addCoins(ctx.user.id, totalCoins);
  } else {
    await WalletHelper.removeCoins(ctx.user.id, totalCoins * -1);
  }
}

export async function minigameFinished(
  ctx: ButtonContext,
  success: boolean,
  difficulty: number,
  maxDuration: number
): Promise<void> {
  await handleMinigameCoins(ctx, success, difficulty, maxDuration);
}

export async function logFailedMinigameAttempt(ctx: ButtonContext, failureReason: string): Promise<void> {
  if (!ctx.game) throw new Error("Game data missing.");

  const failedAttempt = new FailedAttempt({
    userId: ctx.user.id,
    guildId: ctx.game.id,
    attemptType: "minigame",
    failureReason,
    timestamp: new Date()
  });

  await failedAttempt.save();
}
