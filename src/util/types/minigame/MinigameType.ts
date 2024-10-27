import { ButtonContext } from "interactions.ts";

export interface MinigameConfig {
  premiumGuildOnly: boolean;
}

export interface Minigame {
  config: MinigameConfig;
  start(ctx: ButtonContext): Promise<void>;
}
