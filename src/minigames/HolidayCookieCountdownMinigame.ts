import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION = 10 * 1000;

export class HolidayCookieCountdownMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private cookieImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-1.png",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-2.png"
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
      .setTitle("Holiday Cookie Countdown!")
      .setDescription(`Stage ${this.currentStage + 1}: Click the 🍪 button as cookies appear. Each stage adds more cookies!`)
      .setImage(this.cookieImages[Math.floor(Math.random() * this.cookieImages.length)])
      .setFooter({ text: "Hurry! You have limited time!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.cookie"),
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.emptyplate")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You completed the Holiday Cookie Countdown! Your tree has grown!");

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.holidaycookiecountdown.cookie",
      new ButtonBuilder().setEmoji({ name: "🍪" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        const minigame = new HolidayCookieCountdownMinigame();
        minigame.currentStage = ctx.state?.currentStage ?? 0;
        minigame.currentStage++;
        await minigame.nextStage(ctx);
      }
    ),
    new Button(
      "minigame.holidaycookiecountdown.emptyplate",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);
        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You clicked the empty plate. Better luck next time!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    )
  ];
}
