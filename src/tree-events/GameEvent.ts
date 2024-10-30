export interface GameEvent {
  start(ctx: ButtonContext): Promise<void>;
  config: GameEventConfig;
}

export interface GameEventConfig {
  premiumOnly: boolean;
}
