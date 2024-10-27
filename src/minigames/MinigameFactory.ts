// src/minigames/MinigameFactory.ts

import { ButtonContext } from "interactions.ts";
import { SantaPresentMinigame } from "./SantaPresentMinigame";
import { Minigame } from "../util/types/minigame/MinigameType";
import { HotCocoaMinigame } from "./HotCocoaMinigame";
import { GiftUnwrappingMinigame } from "./GiftUnwrappingMinigame";

const minigames: Minigame[] = [new SantaPresentMinigame(), new HotCocoaMinigame(), new GiftUnwrappingMinigame()];

export async function startRandomMinigame(ctx: ButtonContext): Promise<boolean> {
  if (!ctx.game) throw new Error("Game data missing.");

  // Filter out premium minigames if the game doesn't have aiAccess
  const availableMinigames = ctx.game.hasAiAccess
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
