import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION = 10 * 1000;

type CookieCountdownButtonState = {
  currentStage: number;
};

export class HolidayCookieCountdownMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private cookieImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-1.png",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-2.png"
  ];

  private maxStages = 3;

  async start(ctx: ButtonContext): Promise<void> {
    await this.nextStage(ctx, 0);
  }

  private async nextStage(ctx: ButtonContext<CookieCountdownButtonState>, currentStage: number): Promise<void> {
    if (currentStage >= this.maxStages) {
      await this.completeMinigame(ctx);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Holiday Cookie Countdown!")
      .setDescription(`Stage ${currentStage + 1}: Click the 🍪 button as cookies appear. Each stage adds more cookies!`)
      .setImage(this.cookieImages[Math.floor(Math.random() * this.cookieImages.length)])
      .setFooter({ text: "Hurry! You have limited time!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.cookie", { currentStage }),
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.emptyplate", { currentStage })
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder()
      .addEmbed(embed)
      .addComponents(new ActionRowBuilder().addComponents(...buttons));

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx as ButtonContext));
    }, HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<CookieCountdownButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You completed the Holiday Cookie Countdown! Your tree has grown!");

    await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  public static buttons = [
    new Button(
      "minigame.holidaycookiecountdown.cookie",
      new ButtonBuilder().setEmoji({ name: "🍪" }).setStyle(1),
      async (ctx: ButtonContext<CookieCountdownButtonState>): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        const currentStage = ctx.state?.currentStage ?? 0;
        const minigame = new HolidayCookieCountdownMinigame();
        await minigame.nextStage(ctx, currentStage + 1);
      }
    ),
    new Button(
      "minigame.holidaycookiecountdown.emptyplate",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      async (ctx: ButtonContext<CookieCountdownButtonState>): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You clicked the empty plate. Better luck next time!");

        await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx as ButtonContext);
      }
    )
  ];
}
