import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage } from "./MinigameFactory";

const THANKSGIVING_FEAST_MINIGAME_MAX_DURATION = 10 * 1000;

export class ThanksgivingFeastMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private feastImages = [
    "https://example.com/feast-1.jpg",
    "https://example.com/feast-2.jpg",
    "https://example.com/feast-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Thanksgiving Feast!")
      .setDescription(`Click the 🍗 to prepare a Thanksgiving feast and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.feastImages[Math.floor(Math.random() * this.feastImages.length)])
      .setFooter({ text: "Hurry! Prepare the feast before time runs out!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.feast"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-1"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-2"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, THANKSGIVING_FEAST_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleFeastButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You prepared a delicious Thanksgiving feast and your tree grew 2ft taller!")
      .setImage("https://example.com/feast-1.jpg");

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
      .setDescription("You missed the feast. Better luck next time!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.thanksgivingfeast.feast",
      new ButtonBuilder().setEmoji({ name: "🍗" }).setStyle(1),
      ThanksgivingFeastMinigame.handleFeastButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      ThanksgivingFeastMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-2",
      new ButtonBuilder().setEmoji({ name: "🍽️" }).setStyle(4),
      ThanksgivingFeastMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-3",
      new ButtonBuilder().setEmoji({ name: "🥄" }).setStyle(4),
      ThanksgivingFeastMinigame.handleEmptyButton
    )
  ];
}
