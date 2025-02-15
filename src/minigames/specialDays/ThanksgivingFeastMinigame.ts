import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";
import { getRandomButtonStyle } from "../../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../../util/discord/MessageExtenstions";

const THANKSGIVING_FEAST_MINIGAME_MAX_DURATION = 10 * 1000;

export class ThanksgivingFeastMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private feastImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/thanks-giving/thanks-giving-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/thanks-giving/thanks-giving-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/thanks-giving/thanks-giving-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Thanksgiving Feast!")
      .setDescription(
        `Click the 🍗 to prepare a Thanksgiving feast and boost your tree!${getPremiumUpsellMessage(ctx)}`
      )
      .setImage(this.feastImages[Math.floor(Math.random() * this.feastImages.length)])
      .setFooter({ text: "Hurry! Prepare the feast before time runs out!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.feast"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-1"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-2"),
      await ctx.manager.components.createInstance("minigame.thanksgivingfeast.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: THANKSGIVING_FEAST_MINIGAME_MAX_DURATION,
        failureReason: "Timeout",
        minigameName: "Thanksgiving Feast"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
    }, THANKSGIVING_FEAST_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleFeastButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You prepared a delicious Thanksgiving feast and your tree grew 2ft taller!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/thanks-giving/thanks-giving-3.jpg"
      );

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: true,
      difficulty: 1,
      maxDuration: THANKSGIVING_FEAST_MINIGAME_MAX_DURATION,
      minigameName: "Thanksgiving Feast"
    });
    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the feast. Better luck next time!`);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: THANKSGIVING_FEAST_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button",
      minigameName: "Thanksgiving Feast"
    });
    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.thanksgivingfeast.feast",
      new ButtonBuilder().setEmoji({ name: "🍗" }).setStyle(getRandomButtonStyle()),
      ThanksgivingFeastMinigame.handleFeastButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      ThanksgivingFeastMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-2",
      new ButtonBuilder().setEmoji({ name: "🍽️" }).setStyle(getRandomButtonStyle()),
      ThanksgivingFeastMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.thanksgivingfeast.empty-3",
      new ButtonBuilder().setEmoji({ name: "🥄" }).setStyle(getRandomButtonStyle()),
      ThanksgivingFeastMinigame.handleEmptyButton
    )
  ];
}
