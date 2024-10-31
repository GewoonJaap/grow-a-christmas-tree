import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const TINSEL_TWISTER_MINIGAME_MAX_DURATION = 10 * 1000;

export class TinselTwisterMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: true
  };

  private tinselImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/tinsel-twister/tinsel-twister-3.jpg"
  ];

  private currentStage = 0;
  private maxStages = 3;

  async start(ctx: ButtonContext): Promise<void> {
    this.currentStage = 0;
    await this.nextStage(ctx);
  }

  private async nextStage(ctx: ButtonContext): Promise<void> {
    if (this.currentStage >= this.maxStages) {
      await this.completeMinigame(ctx);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Tinsel Twister!")
      .setDescription(`Stage ${this.currentStage + 1}: Click the 🎀 to add tinsel to the tree. Each round requires a faster rhythm!`)
      .setImage(this.tinselImages[Math.floor(Math.random() * this.tinselImages.length)])
      .setFooter({ text: "Hurry! Wrap the tree in sparkling tinsel!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.tinseltwister.tinsel"),
      await ctx.manager.components.createInstance("minigame.tinseltwister.empty")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, TINSEL_TWISTER_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You completed the Tinsel Twister! Your tree has grown!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.tinseltwister.tinsel",
      new ButtonBuilder().setEmoji({ name: "🎀" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        const minigame = new TinselTwisterMinigame();
        minigame.currentStage = ctx.state?.currentStage ?? 0;
        minigame.currentStage++;
        await minigame.nextStage(ctx);
      }
    ),
    new Button(
      "minigame.tinseltwister.empty",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);
        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You missed the tinsel. Better luck next time!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    )
  ];
}
