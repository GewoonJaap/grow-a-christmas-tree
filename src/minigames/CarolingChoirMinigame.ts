import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const CAROLING_CHOIR_MINIGAME_MAX_DURATION = 10 * 1000;

export class CarolingChoirMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private choirImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/caroling-choir/caroling-choir-1.png",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/caroling-choir/caroling-choir-2.png"
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
      .setTitle("Caroling Choir!")
      .setDescription(`Stage ${this.currentStage + 1}: Click the 🎶 to lead the carolers. Follow the correct sequence!`)
      .setImage(this.choirImages[Math.floor(Math.random() * this.choirImages.length)])
      .setFooter({ text: "Lead the carolers in a festive song!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.carolingchoir.note"),
      await ctx.manager.components.createInstance("minigame.carolingchoir.wrongnote")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, CAROLING_CHOIR_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You led the carolers perfectly! Your tree has grown!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.carolingchoir.note",
      new ButtonBuilder().setEmoji({ name: "🎶" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        const minigame = new CarolingChoirMinigame();
        minigame.currentStage = ctx.state?.currentStage ?? 0;
        minigame.currentStage++;
        await minigame.nextStage(ctx);
      }
    ),
    new Button(
      "minigame.carolingchoir.wrongnote",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);
        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You hit a wrong note. Better luck next time!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    )
  ];
}
