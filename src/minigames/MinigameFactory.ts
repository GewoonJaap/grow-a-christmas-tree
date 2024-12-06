import { Button, ButtonBuilder, ButtonContext } from "interactions.ts";
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
import { UNLEASH_FEATURES, UnleashHelper } from "../util/unleash/UnleashHelper";
import { saveFailedAttempt } from "../util/anti-bot/failedAttemptsHelper";
import { buildTreeDisplayMessage, disposeActiveTimeouts } from "../commands";
import { BoosterHelper } from "../util/booster/BoosterHelper";

export interface MinigameEndedType {
  success: boolean;
  difficulty: number;
  maxDuration: number;
  failureReason?: string;
  penalty?: boolean;
}

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
  ...ThanksgivingFeastMinigame.buttons,
  new Button(
    "minigame.refresh",
    new ButtonBuilder().setEmoji({ name: "🔄" }).setLabel("Refresh").setStyle(2),
    async (ctx) => {
      disposeActiveTimeouts(ctx);
      return ctx.reply(await buildTreeDisplayMessage(ctx));
    }
  )
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

  // Add logic to check date and restrict Santa minigame to Christmas day
  if (currentDate.getMonth() === 11 && currentDate.getDate() === 25) {
    availableMinigames.push(new SantaPresentMinigame());
  }

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

  // Increase the probability of selecting the Santa minigame on Christmas day
  if (currentDate.getMonth() === 11 && currentDate.getDate() === 25) {
    const santaMinigame = new SantaPresentMinigame();
    if (Math.random() < 0.7) {
      await santaMinigame.start(ctx);
      return true;
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

export async function startPenaltyMinigame(ctx: ButtonContext): Promise<boolean> {
  if (UnleashHelper.isEnabled(UNLEASH_FEATURES.antiAutoClickerPenalty, ctx)) {
    try {
      console.log(`Starting penalty minigame for user ${ctx.user.id}`);
      const minigame = new GrinchHeistMinigame();
      await minigame.start(ctx, true);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  return false;
}

export async function handleMinigameCoins(
  ctx: ButtonContext | ButtonContext<unknown>,
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

  let totalCoins = Math.abs(baseCoins + difficultyBonus + timeBonus + premiumBonus + ramdomBonus);

  if (totalCoins > 0) {
    totalCoins = BoosterHelper.tryApplyBoosterEffectOnNumber(ctx, "Coin Booster", totalCoins);
    await WalletHelper.addCoins(ctx.user.id, totalCoins);
  } else {
    await WalletHelper.removeCoins(ctx.user.id, totalCoins * -1);
  }
}

export async function minigameFinished(
  ctx: ButtonContext | ButtonContext<unknown>,
  data: MinigameEndedType
): Promise<void> {
  if (data.penalty) {
    console.log(
      `Penalty minigame finished for user ${ctx.user.id}, success: ${data.success}, reason: ${data.failureReason}`
    );
  }
  if (!data.penalty) {
    await handleMinigameCoins(ctx, data.success, data.difficulty, data.maxDuration);
  }
  if (!data.success) {
    await logFailedMinigameAttempt(ctx, data.failureReason ?? "Unknown");
  }
}

export async function logFailedMinigameAttempt(
  ctx: ButtonContext | ButtonContext<unknown>,
  failureReason: string
): Promise<void> {
  if (!ctx.game) throw new Error("Game data missing.");

  await saveFailedAttempt(ctx, "minigame", failureReason);
}
