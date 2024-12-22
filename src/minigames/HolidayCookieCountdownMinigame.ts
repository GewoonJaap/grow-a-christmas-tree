import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";

const HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION = 10 * 1000;

type CookieCountdownButtonState = {
  currentStage: number;
};

export class HolidayCookieCountdownMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private cookieImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/holiday-cookie-countdown/holiday-cookie-countdown-3.jpg"
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
      .setDescription(
        `Stage ${
          currentStage + 1
        }: Click the 🍪 button as cookies appear. Each stage adds more cookies!${getPremiumUpsellMessage(
          ctx as ButtonContext
        )}`
      )
      .setImage(this.cookieImages[Math.floor(Math.random() * this.cookieImages.length)])
      .setFooter({ text: "Hurry! You have limited time!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.cookie", { currentStage }),
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.emptyplate-1", { currentStage }),
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.emptyplate-2", { currentStage }),
      await ctx.manager.components.createInstance("minigame.holidaycookiecountdown.emptyplate-3", { currentStage })
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder()
      .addEmbed(embed)
      .addComponents(new ActionRowBuilder().addComponents(...buttons));

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await HolidayCookieCountdownMinigame.handleEmptyPlateButton(ctx, true);
    }, HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<CookieCountdownButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You collected all the cookies! Your tree has grown 1ft!");

    await safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    await minigameFinished(ctx, {
      success: true,
      difficulty: 1,
      maxDuration: HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION,
      minigameName: "Holiday Cookie Countdown"
    });

    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  private static async handleCookieButton(ctx: ButtonContext<CookieCountdownButtonState>): Promise<void> {
    disposeActiveTimeouts(ctx);

    const currentStage = ctx.state?.currentStage ?? 0;
    const minigame = new HolidayCookieCountdownMinigame();
    await minigame.nextStage(ctx, currentStage + 1);
  }

  private static async handleEmptyPlateButton(
    ctx: ButtonContext<CookieCountdownButtonState>,
    isTimeout = false
  ): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the cookie. Better luck next time!`);

    if (isTimeout) {
      await safeEdit(ctx, new MessageBuilder().addEmbed(embed).setComponents([]));
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION,
        failureReason: "Timeout",
        minigameName: "Holiday Cookie Countdown"
      });
    } else {
      await safeReply(
        ctx,
        new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
      );
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: HOLIDAY_COOKIE_COUNTDOWN_MINIGAME_MAX_DURATION,
        failureReason: "Wrong button",
        minigameName: "Holiday Cookie Countdown"
      });
    }

    transitionToDefaultTreeView(ctx as ButtonContext);
  }

  public static buttons = [
    new Button(
      "minigame.holidaycookiecountdown.cookie",
      new ButtonBuilder().setEmoji({ name: "🍪" }).setStyle(getRandomButtonStyle()),
      HolidayCookieCountdownMinigame.handleCookieButton
    ),
    new Button(
      "minigame.holidaycookiecountdown.emptyplate-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      HolidayCookieCountdownMinigame.handleEmptyPlateButton
    ),
    new Button(
      "minigame.holidaycookiecountdown.emptyplate-2",
      new ButtonBuilder().setEmoji({ name: "🍽️" }).setStyle(getRandomButtonStyle()),
      HolidayCookieCountdownMinigame.handleEmptyPlateButton
    ),
    new Button(
      "minigame.holidaycookiecountdown.emptyplate-3",
      new ButtonBuilder().setEmoji({ name: "🥠" }).setStyle(getRandomButtonStyle()),
      HolidayCookieCountdownMinigame.handleEmptyPlateButton
    )
  ];
}
