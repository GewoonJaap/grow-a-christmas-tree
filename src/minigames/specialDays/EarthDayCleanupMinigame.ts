import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";
import { getRandomButtonStyle } from "../../util/discord/DiscordApiExtensions";

const EARTH_DAY_CLEANUP_MINIGAME_MAX_DURATION = 10 * 1000;

export class EarthDayCleanupMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private cleanupImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/earthday-cleanup/earthday-cleanup-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/earthday-cleanup/earthday-cleanup-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/earthday-cleanup/earthday-cleanup-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Earth Day Cleanup!")
      .setDescription(`Click the 🗑️ to clean up the environment and boost your tree!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.cleanupImages[Math.floor(Math.random() * this.cleanupImages.length)])
      .setFooter({ text: "Hurry! Clean up as much as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.earthdaycleanup.trash"),
      await ctx.manager.components.createInstance("minigame.earthdaycleanup.empty-1"),
      await ctx.manager.components.createInstance("minigame.earthdaycleanup.empty-2"),
      await ctx.manager.components.createInstance("minigame.earthdaycleanup.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: EARTH_DAY_CLEANUP_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, EARTH_DAY_CLEANUP_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleTrashButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You cleaned up the environment and your tree grew 2ft taller!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/earthday-cleanup/earthday-cleanup-1.jpg"
      );

    ctx.reply(new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons)));

    await minigameFinished(ctx, { success: true, difficulty: 1, maxDuration: EARTH_DAY_CLEANUP_MINIGAME_MAX_DURATION });

    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the trash. Better luck next time!`);

    ctx.reply(new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons)));

    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: EARTH_DAY_CLEANUP_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.earthdaycleanup.trash",
      new ButtonBuilder().setEmoji({ name: "🗑️" }).setStyle(getRandomButtonStyle()),
      EarthDayCleanupMinigame.handleTrashButton
    ),
    new Button(
      "minigame.earthdaycleanup.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      EarthDayCleanupMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.earthdaycleanup.empty-2",
      new ButtonBuilder().setEmoji({ name: "🗑️" }).setStyle(getRandomButtonStyle()),
      EarthDayCleanupMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.earthdaycleanup.empty-3",
      new ButtonBuilder().setEmoji({ name: "🗑️" }).setStyle(getRandomButtonStyle()),
      EarthDayCleanupMinigame.handleEmptyButton
    )
  ];
}
