import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { GameEvent, GameEventConfig } from "./GameEvent";

export class GrinchEvent implements GameEvent {
  config: GameEventConfig = {
    premiumOnly: false
  };

  public async start(ctx: ButtonContext): Promise<void> {
    const delay = Math.random() * 60000; // Random delay between 0 and 60 seconds

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);

      const button = await ctx.manager.components.createInstance("grinch.defeat");

      const message = new MessageBuilder()
        .addEmbed(new EmbedBuilder().setTitle("The Grinch has appeared!").setDescription("Click the button to defeat the Grinch."))
        .addComponents(new ActionRowBuilder().addComponents(button));

      await ctx.reply(message);
    }, delay);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  public async defeatGrinch(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");

    const randomOutcome = Math.random();
    let message;

    if (randomOutcome < 0.5) {
      message = "You successfully defeated the Grinch! Your tree is safe.";
    } else {
      await this.failToDefeatGrinch(ctx);
      return;
    }

    const embed = new EmbedBuilder().setTitle(ctx.game.name).setDescription(message);
    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public async failToDefeatGrinch(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");

    ctx.game.size -= 1;
    if (ctx.game.size < 0) ctx.game.size = 0;

    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You failed to defeat the Grinch. Your tree has lost 1 size.");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "grinch.defeat",
      new ButtonBuilder().setEmoji({ name: "🦸" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        await new GrinchEvent().defeatGrinch(ctx);
      }
    )
  ];
}
