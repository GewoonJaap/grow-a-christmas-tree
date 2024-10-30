import { ButtonContext } from "interactions.ts";
import { GrinchEvent } from "./GrinchEvent";
import { PresentEvent } from "./PresentEvent";
import { GameEvent } from "./GameEvent";

export class TreeEventFactory {
  private static events: GameEvent[] = [new GrinchEvent(), new PresentEvent()];

  public static async scheduleRandomTreeEvent(ctx: ButtonContext): Promise<void> {
    if (Math.random() > 0.25) return;

    const availableEvents = ctx.game?.hasAiAccess
      ? this.events
      : this.events.filter((event) => !event.config.premiumOnly);

    if (availableEvents.length === 0) return;

    const randomDelay = Math.random() * 60000; // Random delay between 0 and 60 seconds
    const randomEventIndex = Math.floor(Math.random() * availableEvents.length);
    const selectedEvent = availableEvents[randomEventIndex];

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await selectedEvent.start(ctx);

      // If after 30 seconds after starting the event the user hasn't done anything, return to main tree message again
      const returnTimeoutId = setTimeout(async () => {
        ctx.timeouts.delete(ctx.interaction.message.id);
        await ctx.edit(await buildTreeDisplayMessage(ctx));
      }, 30000);

      ctx.timeouts.set(ctx.interaction.message.id, returnTimeoutId);
    }, randomDelay);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }
}
