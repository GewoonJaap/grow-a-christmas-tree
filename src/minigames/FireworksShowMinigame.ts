import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage } from "./MinigameFactory";

const FIREWORKS_SHOW_MINIGAME_MAX_DURATION = 10 * 1000;

export class FireworksShowMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private fireworksImages = [
    "https://example.com/fireworks-1.jpg",
    "https://example.com/fireworks-2.jpg",
    "https://example.com/fireworks-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Fireworks Show!")
      .setDescription(`Click the 🎆 to launch fireworks and celebrate!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.fireworksImages[Math.floor(Math.random() * this.fireworksImages.length)])
      .setFooter({ text: "Hurry! Launch as many fireworks as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.fireworksshow.firework"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-1"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-2"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, FIREWORKS_SHOW_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleFireworkButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You launched a spectacular fireworks show! Your tree grew 2ft taller!")
      .setImage("https://example.com/fireworks-1.jpg");

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
      .setDescription("You missed the fireworks. Better luck next time!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.fireworksshow.firework",
      new ButtonBuilder().setEmoji({ name: "🎆" }).setStyle(1),
      FireworksShowMinigame.handleFireworkButton
    ),
    new Button(
      "minigame.fireworksshow.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      FireworksShowMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.fireworksshow.empty-2",
      new ButtonBuilder().setEmoji({ name: "🎇" }).setStyle(4),
      FireworksShowMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.fireworksshow.empty-3",
      new ButtonBuilder().setEmoji({ name: "🎉" }).setStyle(4),
      FireworksShowMinigame.handleEmptyButton
    )
  ];
}
