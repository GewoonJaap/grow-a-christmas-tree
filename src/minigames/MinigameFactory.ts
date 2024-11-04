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
import { WalletHelper } from "../util/wallet/WalletHelper";

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

  const availableMinigames =
    ctx.game.hasAiAccess || process.env.DEV_MODE === "true"
      ? minigames
      : minigames.filter((minigame) => !minigame.config.premiumGuildOnly);

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

export async function handleMinigameCoins(
  ctx: ButtonContext,
  success: boolean,
  difficulty: number,
  maxDuration: number
): Promise<void> {
  if (!ctx.game) throw new Error("Game data missing.");

  const baseCoins = success ? 1 : -5;
  const difficultyBonus = difficulty * (success ? 1 : -1);
  const timeBonus = 0;
  const premiumBonus = ctx.game.hasAiAccess ? 5 : 0;

  const totalCoins = Math.abs(baseCoins + difficultyBonus + timeBonus + premiumBonus);

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
