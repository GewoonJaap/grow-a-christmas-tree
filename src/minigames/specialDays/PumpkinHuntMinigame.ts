import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";
import { getRandomButtonStyle } from "../../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../../util/discord/MessageExtenstions";

const PUMPKIN_HUNT_MINIGAME_MAX_DURATION = 10 * 1000;

export class PumpkinHuntMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private pumpkinImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/halloween/halloween-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/halloween/halloween-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/halloween/halloween-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Pumpkin Hunt!")
      .setDescription(`Click the 🎃 to find hidden pumpkins and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.pumpkinImages[Math.floor(Math.random() * this.pumpkinImages.length)])
      .setFooter({ text: "Hurry! Find as many pumpkins as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.pumpkin"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-1"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-2"),
      await ctx.manager.components.createInstance("minigame.pumpkinhunt.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: PUMPKIN_HUNT_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
    }, PUMPKIN_HUNT_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handlePumpkinButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You found a hidden pumpkin and your tree grew 2ft taller!")
      .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/halloween/halloween-2.jpg");

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, { success: true, difficulty: 1, maxDuration: PUMPKIN_HUNT_MINIGAME_MAX_DURATION });
    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the pumpkins. Better luck next time!`);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: PUMPKIN_HUNT_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });
    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.pumpkinhunt.pumpkin",
      new ButtonBuilder().setEmoji({ name: "🎃" }).setStyle(getRandomButtonStyle()),
      PumpkinHuntMinigame.handlePumpkinButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      PumpkinHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-2",
      new ButtonBuilder().setEmoji({ name: "👻" }).setStyle(getRandomButtonStyle()),
      PumpkinHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.pumpkinhunt.empty-3",
      new ButtonBuilder().setEmoji({ name: "🕸️" }).setStyle(getRandomButtonStyle()),
      PumpkinHuntMinigame.handleEmptyButton
    )
  ];
}
