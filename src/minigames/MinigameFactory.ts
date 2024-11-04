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

function calculateEasterDate(year: number): Date {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

export async function startRandomMinigame(ctx: ButtonContext): Promise<boolean> {
  if (!ctx.game) throw new Error("Game data missing.");

  const specialDays = [
    {
      name: "New Year's Eve",
      dateRange: [new Date(new Date().getFullYear(), 11, 31)],
      minigame: new FireworksShowMinigame()
    },
    {
      name: "Valentine's Day",
      dateRange: [new Date(new Date().getFullYear(), 1, 14)],
      minigame: new HeartCollectionMinigame()
    },
    {
      name: "Halloween",
      dateRange: [new Date(new Date().getFullYear(), 9, 24), new Date(new Date().getFullYear(), 9, 31)],
      minigame: new PumpkinHuntMinigame()
    },
    {
      name: "Independence Day",
      dateRange: [new Date(new Date().getFullYear(), 6, 4)],
      minigame: new FireworksShowMinigame()
    },
    {
      name: "Thanksgiving",
      dateRange: [new Date(new Date().getFullYear(), 10, 22), new Date(new Date().getFullYear(), 10, 28)],
      minigame: new ThanksgivingFeastMinigame()
    },
    {
      name: "St. Patrick's Day",
      dateRange: [new Date(new Date().getFullYear(), 2, 17)],
      minigame: new StPatricksDayTreasureHuntMinigame()
    },
    {
      name: "Earth Day",
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

  const availableMinigames =
    ctx.game.hasAiAccess || process.env.DEV_MODE === "true"
      ? [...minigames, ...specialDayMinigames]
      : [...minigames.filter((minigame) => !minigame.config.premiumGuildOnly), ...specialDayMinigames];

  if (availableMinigames.length === 0) {
    return false;
  }

  const randomIndex = Math.floor(Math.random() * availableMinigames.length);
  const selectedMinigame = availableMinigames[randomIndex];

  await selectedMinigame.start(ctx);
  return true;
}

export function getPremiumUpsellMessage(ctx: ButtonContext, textSuffix = "\n", appearAlways = false): string {
  const shouldAppear = appearAlways || Math.random() < 0.4;
  if (!ctx.game?.hasAiAccess && shouldAppear) {
    return `${textSuffix}You have just discovered a premium feature! Subscribe in the [store](https://discord.com/application-directory/1050722873569968128/store) to enjoy more fun minigames!`;
  }
  return "";
}
