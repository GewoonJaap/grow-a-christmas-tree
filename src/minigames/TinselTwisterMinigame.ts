import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";

const TINSEL_TWISTER_MINIGAME_MAX_DURATION = 10 * 1000;

type TinselTwisterButtonState = {
  currentStage: number;
};

export class TinselTwisterMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: true
  };

  private tinselImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-3.jpg"
  ];

  private maxStages = 3;

  async start(ctx: ButtonContext): Promise<void> {
    await this.nextStage(ctx, 0);
  }

  private async nextStage(ctx: ButtonContext<TinselTwisterButtonState>, currentStage: number): Promise<void> {
    if (currentStage >= this.maxStages) {
      await this.completeMinigame(ctx);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Tinsel Twister!")
      .setDescription(
        `Stage ${
          currentStage + 1
        }: Click the 🎀 to add tinsel to the tree. Each round requires a faster rhythm!${getPremiumUpsellMessage(
          ctx as ButtonContext
        )}`
      )
      .setImage(this.tinselImages[Math.floor(Math.random() * this.tinselImages.length)])
      .setFooter({ text: "Hurry! Wrap the tree in sparkling tinsel!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.tinseltwister.tinsel", { currentStage }),
      await ctx.manager.components.createInstance("minigame.tinseltwister.empty-1", { currentStage }),
      await ctx.manager.components.createInstance("minigame.tinseltwister.empty-2", { currentStage }),
      await ctx.manager.components.createInstance("minigame.tinseltwister.empty-3", { currentStage })
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder()
      .addEmbed(embed)
      .addComponents(new ActionRowBuilder().addComponents(...buttons));

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx as ButtonContext));
    }, TINSEL_TWISTER_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<TinselTwisterButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`You completed the Tinsel Twister! Your tree has grown 1ft!`);

    await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    await minigameFinished(ctx as ButtonContext, true, 1, TINSEL_TWISTER_MINIGAME_MAX_DURATION);
    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  private static async handleTinselButton(ctx: ButtonContext<TinselTwisterButtonState>): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    const currentStage = ctx.state?.currentStage ?? 0;
    const minigame = new TinselTwisterMinigame();
    await minigame.nextStage(ctx, currentStage + 1);
  }

  private static async handleEmptyButton(
    ctx: ButtonContext<TinselTwisterButtonState>,
    isTimeout = false
  ): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`You missed the tinsel. Better luck next time!`);

    if (isTimeout) {
      await ctx.edit(new MessageBuilder().addEmbed(embed).setComponents([]));
    } else {
      await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    }

    await minigameFinished(ctx as ButtonContext, false, 1, TINSEL_TWISTER_MINIGAME_MAX_DURATION);
    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  public static buttons = [
    new Button(
      "minigame.tinseltwister.tinsel",
      new ButtonBuilder().setEmoji({ name: "🎀" }).setStyle(1),
      TinselTwisterMinigame.handleTinselButton
    ),
    new Button(
      "minigame.tinseltwister.empty-1",
      new ButtonBuilder().setEmoji({ name: "🦊" }).setStyle(4),
      TinselTwisterMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.tinseltwister.empty-2",
      new ButtonBuilder().setEmoji({ name: "🦉" }).setStyle(4),
      TinselTwisterMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.tinseltwister.empty-3",
      new ButtonBuilder().setEmoji({ name: "🌲" }).setStyle(4),
      TinselTwisterMinigame.handleEmptyButton
    )
  ];
}
