import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { getRandomElement, shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";

const SANTA_SLEIGH_RIDE_MINIGAME_MAX_DURATION = 10 * 1000;

type SantaSleighRideButtonState = {
  currentStage: number;
};

export class SantaSleighRideMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private sleighRideImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-3.jpg"
  ];

  private sleighRideImagesFinished = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-complete-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-complete-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-sleigh-ride/santa-sleigh-ride-complete-3.jpg"
  ];

  private maxStages = 3;

  async start(ctx: ButtonContext): Promise<void> {
    await this.nextStage(ctx, 0);
  }

  private async nextStage(ctx: ButtonContext<SantaSleighRideButtonState>, currentStage: number): Promise<void> {
    if (currentStage >= this.maxStages) {
      await this.completeMinigame(ctx);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Santa's Sleigh Ride!")
      .setDescription(
        `Stage ${
          currentStage + 1
        }: Click the 🎅 to help Santa deliver presents. Follow the correct sequence!${getPremiumUpsellMessage(
          ctx as ButtonContext
        )}`
      )
      .setImage(getRandomElement(this.sleighRideImages) ?? this.sleighRideImages[0])
      .setFooter({ text: "Help Santa deliver presents to earn rewards!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.santasleighride.santa", { currentStage }),
      await ctx.manager.components.createInstance("minigame.santasleighride.wrongbutton-1", { currentStage }),
      await ctx.manager.components.createInstance("minigame.santasleighride.wrongbutton-2", { currentStage }),
      await ctx.manager.components.createInstance("minigame.santasleighride.wrongbutton-3", { currentStage })
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
        maxDuration: SANTA_SLEIGH_RIDE_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx as ButtonContext));
    }, SANTA_SLEIGH_RIDE_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private async completeMinigame(ctx: ButtonContext<SantaSleighRideButtonState>): Promise<void> {
    if (!ctx.game) throw new Error("Game data missing.");
    let extraTreeSize = Math.floor(Math.random() * 3) + 1;
    if (SpecialDayHelper.isChristmas()) {
      extraTreeSize *= 2;
    }
    if (ctx.game.hasAiAccess) {
      extraTreeSize *= 1.5;
    }
    ctx.game.size += extraTreeSize;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`You helped Santa deliver presents! Your tree has grown ${extraTreeSize}ft!`)
      .setImage(getRandomElement(this.sleighRideImagesFinished) ?? this.sleighRideImagesFinished[0])
      .setFooter({ text: SpecialDayHelper.isChristmas() ? "🎄Merry Christmas!🎄🎅" : "Thanks for helping Santa!🎅" });

    await safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    transitionToDefaultTreeView(ctx as ButtonContext);

    await minigameFinished(ctx as ButtonContext, {
      success: true,
      difficulty: 1,
      maxDuration: SANTA_SLEIGH_RIDE_MINIGAME_MAX_DURATION
    });
  }

  private static async handleSantaButton(ctx: ButtonContext<SantaSleighRideButtonState>): Promise<void> {
    disposeActiveTimeouts(ctx);

    const currentStage = ctx.state?.currentStage ?? 0;
    const minigame = new SantaSleighRideMinigame();
    await minigame.nextStage(ctx, currentStage + 1);
  }

  private static async handleWrongButton(ctx: ButtonContext<SantaSleighRideButtonState>): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You clicked the wrong button. Better luck next time!`);

    await safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    transitionToDefaultTreeView(ctx as ButtonContext);

    await minigameFinished(ctx as ButtonContext, {
      success: false,
      difficulty: 1,
      maxDuration: SANTA_SLEIGH_RIDE_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });
  }

  public static buttons = [
    new Button(
      "minigame.santasleighride.santa",
      new ButtonBuilder().setEmoji({ name: "🎅" }).setStyle(getRandomButtonStyle()),
      SantaSleighRideMinigame.handleSantaButton
    ),
    new Button(
      "minigame.santasleighride.wrongbutton-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      SantaSleighRideMinigame.handleWrongButton
    ),
    new Button(
      "minigame.santasleighride.wrongbutton-2",
      new ButtonBuilder().setEmoji({ name: "🎁" }).setStyle(getRandomButtonStyle()),
      SantaSleighRideMinigame.handleWrongButton
    ),
    new Button(
      "minigame.santasleighride.wrongbutton-3",
      new ButtonBuilder().setEmoji({ name: "⛄" }).setStyle(getRandomButtonStyle()),
      SantaSleighRideMinigame.handleWrongButton
    )
  ];
}
