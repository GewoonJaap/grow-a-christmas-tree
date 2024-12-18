import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { getRandomElement, shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";
const SANTA_MINIGAME_MAX_DURATION = 10 * 1000;

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-present/santa-present-minigame-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-present/santa-present-minigame-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-present/santa-present-minigame-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-present/santa-present-minigame-4.jpg"
];

export class SantaPresentMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("🎅 Santa is Here!")
      .setDescription(
        `Click the 🎁 to give your tree an extra boost!. But avoid the 🧙!${getPremiumUpsellMessage(ctx)}`
      )
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      .setFooter({ text: "Hurry! Before you know santa will be gone!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.santapresent.present"),
      await ctx.manager.components.createInstance("minigame.santapresent.witch-1"),
      await ctx.manager.components.createInstance("minigame.santapresent.witch-2"),
      await ctx.manager.components.createInstance("minigame.santapresent.witch-3")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: SANTA_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
    }, SANTA_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handlePresentButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size++;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`Enjoy your present! There was some magic inside which made your tree grow 1ft!`)
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0]);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    await minigameFinished(ctx, { success: true, difficulty: 1, maxDuration: SANTA_MINIGAME_MAX_DURATION });

    transitionToDefaultTreeView(ctx);
  }

  private static async handleWitchButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, Whoops! The witch stole your present!`)
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0]);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );

    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: SANTA_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.santapresent.present",
      new ButtonBuilder().setEmoji({ name: "🎁" }).setStyle(getRandomButtonStyle()),
      SantaPresentMinigame.handlePresentButton
    ),
    new Button(
      "minigame.santapresent.witch-1",
      new ButtonBuilder().setEmoji({ name: "🧙" }).setStyle(getRandomButtonStyle()),
      SantaPresentMinigame.handleWitchButton
    ),
    new Button(
      "minigame.santapresent.witch-2",
      new ButtonBuilder().setEmoji({ name: "🥶" }).setStyle(getRandomButtonStyle()),
      SantaPresentMinigame.handleWitchButton
    ),
    new Button(
      "minigame.santapresent.witch-3",
      new ButtonBuilder().setEmoji({ name: "🥶" }).setStyle(getRandomButtonStyle()),
      SantaPresentMinigame.handleWitchButton
    )
  ];
}
