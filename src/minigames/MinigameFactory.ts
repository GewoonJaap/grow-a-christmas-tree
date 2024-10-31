import { ButtonContext } from "interactions.ts";
import { SantaPresentMinigame } from "./SantaPresentMinigame";
import { Minigame } from "../util/types/minigame/MinigameType";
import { HotCocoaMinigame } from "./HotCocoaMinigame";
import { GiftUnwrappingMinigame } from "./GiftUnwrappingMinigame";
import { SnowballFightMinigame } from "./SnowballFightMinigame";
import { GrinchHeistMinigame } from "./GrinchHeistMinigame";

const minigames: Minigame[] = [
  new SantaPresentMinigame(),
  new HotCocoaMinigame(),
  new GiftUnwrappingMinigame(),
  new SnowballFightMinigame(),
  new GrinchHeistMinigame()
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
