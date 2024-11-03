import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage } from "./MinigameFactory";

const PUMPKIN_HUNT_MINIGAME_MAX_DURATION = 10 * 1000;

export class PumpkinHuntMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private pumpkinImages = [
    "https://example.com/pumpkin-1.jpg",
    "https://example.com/pumpkin-2.jpg",
    "https://example.com/pumpkin-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Pumpkin Hunt!")
      .setDescription(`Click the 🎃 to find hidden pumpkins and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.pumpkinImages[Math.floor(Math.random() * this.pumpkinImages.length)])
      .setFooter({ text: "Hurry! Find as many pumpkins as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.pumpkin"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-1"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-2"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, PUMPKIN_HUNT_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handlePumpkinButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You found a hidden pumpkin and your tree grew 2ft taller!")
      .setImage("https://example.com/pumpkin-1.jpg");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You missed the pumpkins. Better luck next time!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.pumpkinhunt.pumpkin",
      new ButtonBuilder().setEmoji({ name: "🎃" }).setStyle(1),
      PumpkinHuntMinigame.handlePumpkinButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      PumpkinHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-2",
      new ButtonBuilder().setEmoji({ name: "👻" }).setStyle(4),
      PumpkinHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-3",
      new ButtonBuilder().setEmoji({ name: "🕸️" }).setStyle(4),
      PumpkinHuntMinigame.handleEmptyButton
    )
  ];
}
