import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";

const HEART_COLLECTION_MINIGAME_MAX_DURATION = 10 * 1000;

export class HeartCollectionMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private heartImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/valentine-day/valentine-day-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/valentine-day/valentine-day-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/valentine-day/valentine-day-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Heart Collection!")
      .setDescription(`Click the ❤️ to collect hearts and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.heartImages[Math.floor(Math.random() * this.heartImages.length)])
      .setFooter({ text: "Hurry! Collect as many hearts as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.heartcollection.heart"),
      await ctx.manager.components.createInstance("minigame.heartcollection.empty-1"),
      await ctx.manager.components.createInstance("minigame.heartcollection.empty-2"),
      await ctx.manager.components.createInstance("minigame.heartcollection.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, HEART_COLLECTION_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleHeartButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You collected hearts and your tree grew 2ft taller!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/valentine-day/valentine-day-3.jpg"
      );

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    minigameFinished(ctx as ButtonContext, true, 1, HEART_COLLECTION_MINIGAME_MAX_DURATION);
    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You missed the hearts. Better luck next time!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    minigameFinished(ctx as ButtonContext, false, 1, HEART_COLLECTION_MINIGAME_MAX_DURATION);
    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.heartcollection.heart",
      new ButtonBuilder().setEmoji({ name: "❤️" }).setStyle(1),
      HeartCollectionMinigame.handleHeartButton
    ),
    new Button(
      "minigame.heartcollection.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      HeartCollectionMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.heartcollection.empty-2",
      new ButtonBuilder().setEmoji({ name: "💔" }).setStyle(4),
      HeartCollectionMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.heartcollection.empty-3",
      new ButtonBuilder().setEmoji({ name: "🖤" }).setStyle(4),
      HeartCollectionMinigame.handleEmptyButton
    )
  ];
}