import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";
import { getRandomButtonStyle } from "../../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../../util/discord/MessageExtenstions";

const STPATRICKS_TREASURE_HUNT_MINIGAME_MAX_DURATION = 10 * 1000;

export class StPatricksDayTreasureHuntMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private treasureImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/st-patricks-day/st-patricks-day-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/st-patricks-day/st-patricks-day-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/st-patricks-day/st-patricks-day-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("St. Patrick's Day Treasure Hunt!")
      .setDescription(`Click the 🍀 to find hidden treasures and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.treasureImages[Math.floor(Math.random() * this.treasureImages.length)])
      .setFooter({ text: "Hurry! Find as many treasures as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.stpatrickstreasurehunt.treasure"),
      await ctx.manager.components.createInstance("minigame.stpatrickstreasurehunt.empty-1"),
      await ctx.manager.components.createInstance("minigame.stpatrickstreasurehunt.empty-2"),
      await ctx.manager.components.createInstance("minigame.stpatrickstreasurehunt.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: STPATRICKS_TREASURE_HUNT_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
    }, STPATRICKS_TREASURE_HUNT_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleTreasureButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You found a hidden treasure and your tree grew 2ft taller!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/st-patricks-day/st-patricks-day-1.jpg"
      );

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: true,
      difficulty: 1,
      maxDuration: STPATRICKS_TREASURE_HUNT_MINIGAME_MAX_DURATION
    });
    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the treasures. Better luck next time!`);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: STPATRICKS_TREASURE_HUNT_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });
    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.stpatrickstreasurehunt.treasure",
      new ButtonBuilder().setEmoji({ name: "🍀" }).setStyle(getRandomButtonStyle()),
      StPatricksDayTreasureHuntMinigame.handleTreasureButton
    ),
    new Button(
      "minigame.stpatrickstreasurehunt.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      StPatricksDayTreasureHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.stpatrickstreasurehunt.empty-2",
      new ButtonBuilder().setEmoji({ name: "🍂" }).setStyle(getRandomButtonStyle()),
      StPatricksDayTreasureHuntMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.stpatrickstreasurehunt.empty-3",
      new ButtonBuilder().setEmoji({ name: "🍃" }).setStyle(getRandomButtonStyle()),
      StPatricksDayTreasureHuntMinigame.handleEmptyButton
    )
  ];
}
