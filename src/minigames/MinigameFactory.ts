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
    return `${textSuffix}You have just discovered a premium feature! Subscribe in the [store](https://discord.com/application-directory/1050722873569968128/store) to enjoy more fun minigames!`;
  }
  return "";
}
