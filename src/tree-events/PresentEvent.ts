import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { GameEvent, GameEventConfig } from "./GameEvent";

export class PresentEvent implements GameEvent {
  config: GameEventConfig = {
    premiumOnly: false
  };

  public async start(ctx: ButtonContext): Promise<void> {
    const delay = Math.random() * 60000; // Random delay between 0 and 60 seconds

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);

      const button = await ctx.manager.components.createInstance("present.collect");

      const message = new MessageBuilder()
        .addEmbed(new EmbedBuilder().setTitle("A present has dropped!").setDescription("Click the button to collect the present."))
        .addComponents(new ActionRowBuilder().addComponents(button));

      await ctx.reply(message);

      // If after 30 seconds after starting the event the user hasn't done anything, return to main tree message again
      const returnTimeoutId = setTimeout(async () => {
        ctx.timeouts.delete(ctx.interaction.message.id);
        await ctx.edit(await buildTreeDisplayMessage(ctx));
      }, 30000);

      ctx.timeouts.set(ctx.interaction.message.id, returnTimeoutId);
    }, delay);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  public async collectPresent(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");

    const randomOutcome = Math.random();
    let message;

    if (randomOutcome < 0.33) {
      ctx.game.lastWateredAt = 0;
      message = "You collected a present and found a magical watering can! Your tree can be watered again.";
    } else if (randomOutcome < 0.66) {
      ctx.game.size += 2;
      message = "You collected a present and found a special fertilizer! Your tree grew extra tall.";
    } else {
      message = "You collected a present but found nothing special inside.";
    }

    await ctx.game.save();

    const embed = new EmbedBuilder().setTitle(ctx.game.name).setDescription(message);
    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "present.collect",
      new ButtonBuilder().setEmoji({ name: "🎁" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        await new PresentEvent().collectPresent(ctx);
      }
    )
  ];
}
