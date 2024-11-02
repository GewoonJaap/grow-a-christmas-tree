import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage } from "./MinigameFactory";

const CAROLING_CHOIR_MINIGAME_MAX_DURATION = 10 * 1000;

type CarolingChoirButtonState = {
  currentStage: number;
};

export class CarolingChoirMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private choirImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/caroling-choir/caroling-choir-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/caroling-choir/caroling-choir-2.jpg"
  ];

  private maxStages = 3;

  async start(ctx: ButtonContext): Promise<void> {
    await this.nextStage(ctx, 0);
  }

  private async nextStage(ctx: ButtonContext<CarolingChoirButtonState>, currentStage: number): Promise<void> {
    if (currentStage >= this.maxStages) {
      await this.completeMinigame(ctx);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Caroling Choir!")
      .setDescription(
        `Stage ${
          currentStage + 1
        }: Click the 🎶 to lead the carolers. Follow the correct sequence!${getPremiumUpsellMessage(
          ctx as ButtonContext
        )}`
      )
      .setImage(this.choirImages[Math.floor(Math.random() * this.choirImages.length)])
      .setFooter({ text: "Lead the carolers in a festive song!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.carolingchoir.note", { currentStage }),
      await ctx.manager.components.createInstance("minigame.carolingchoir.wrongnote-1", { currentStage }),
      await ctx.manager.components.createInstance("minigame.carolingchoir.wrongnote-2", { currentStage }),
      await ctx.manager.components.createInstance("minigame.carolingchoir.wrongnote-3", { currentStage })
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder()
      .addEmbed(embed)
      .addComponents(new ActionRowBuilder().addComponents(...buttons));

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx as ButtonContext));
    }, CAROLING_CHOIR_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You led the carolers perfectly! Your tree has grown 1ft!");

    await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  private static async handleNoteButton(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    const currentStage = ctx.state?.currentStage ?? 0;
    const minigame = new CarolingChoirMinigame();
    await minigame.nextStage(ctx, currentStage + 1);
  }

  private static async handleWrongNoteButton(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You hit a wrong note. Better luck next time!");

    await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  public static buttons = [
    new Button(
      "minigame.carolingchoir.note",
      new ButtonBuilder().setEmoji({ name: "🎶" }).setStyle(1),
      CarolingChoirMinigame.handleNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-1",
      new ButtonBuilder().setEmoji({ name: "🪘" }).setStyle(4),
      CarolingChoirMinigame.handleWrongNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-2",
      new ButtonBuilder().setEmoji({ name: "🐈" }).setStyle(4),
      CarolingChoirMinigame.handleWrongNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-3",
      new ButtonBuilder().setEmoji({ name: "😼" }).setStyle(4),
      CarolingChoirMinigame.handleWrongNoteButton
    )
  ];
}
