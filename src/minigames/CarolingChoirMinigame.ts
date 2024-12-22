import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { getRandomElements, shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { SPOOKY_EMOJIS, getRandomEmojiWithExclusion } from "../util/emoji";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";

const CAROLING_CHOIR_MINIGAME_MAX_DURATION = 10 * 1000;
const BUTTON_FAIL_EMOJIS = getRandomElements(SPOOKY_EMOJIS, 3);
const BUTTON_SUCCESS_EMOJI = getRandomEmojiWithExclusion(BUTTON_FAIL_EMOJIS);

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
        }: Click the ${BUTTON_SUCCESS_EMOJI} to lead the carolers. Follow the correct sequence!${getPremiumUpsellMessage(
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

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx as ButtonContext, {
        success: false,
        difficulty: 1,
        maxDuration: CAROLING_CHOIR_MINIGAME_MAX_DURATION,
        failureReason: "Timeout",
        minigameName: "Caroling Choir"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx as ButtonContext));
    }, CAROLING_CHOIR_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You led the carolers perfectly! Your tree has grown 1ft!");

    await safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    transitionToDefaultTreeView(ctx as ButtonContext);

    await minigameFinished(ctx as ButtonContext, {
      success: true,
      difficulty: 1,
      maxDuration: CAROLING_CHOIR_MINIGAME_MAX_DURATION,
      minigameName: "Caroling Choir"
    });
  }

  private static async handleNoteButton(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    disposeActiveTimeouts(ctx);

    const currentStage = ctx.state?.currentStage ?? 0;
    const minigame = new CarolingChoirMinigame();
    await minigame.nextStage(ctx, currentStage + 1);
  }

  private static async handleWrongNoteButton(ctx: ButtonContext<CarolingChoirButtonState>): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You hit a wrong note. Better luck next time!`);

    await safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    transitionToDefaultTreeView(ctx as ButtonContext);

    await minigameFinished(ctx as ButtonContext, {
      success: false,
      difficulty: 1,
      maxDuration: CAROLING_CHOIR_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button",
      minigameName: "Caroling Choir"
    });
  }

  public static buttons = [
    new Button(
      "minigame.carolingchoir.note",
      new ButtonBuilder().setEmoji({ name: BUTTON_SUCCESS_EMOJI }).setStyle(getRandomButtonStyle()),
      CarolingChoirMinigame.handleNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-1",
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[0] }).setStyle(getRandomButtonStyle()),
      CarolingChoirMinigame.handleWrongNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-2",
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[1] }).setStyle(getRandomButtonStyle()),
      CarolingChoirMinigame.handleWrongNoteButton
    ),
    new Button(
      "minigame.carolingchoir.wrongnote-3",
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[2] }).setStyle(getRandomButtonStyle()),
      CarolingChoirMinigame.handleWrongNoteButton
    )
  ];
}
