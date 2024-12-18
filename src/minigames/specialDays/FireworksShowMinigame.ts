import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { buildTreeDisplayMessage, disposeActiveTimeouts, transitionToDefaultTreeView } from "../../commands/Tree";
import { Minigame, MinigameConfig } from "../../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "../MinigameFactory";
import { getRandomButtonStyle } from "../../util/discord/DiscordApiExtensions";
import { safeReply, safeEdit } from "../../util/discord/MessageExtenstions";

const FIREWORKS_SHOW_MINIGAME_MAX_DURATION = 10 * 1000;

export class FireworksShowMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private fireworksImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/newyears-eve/newyears-eve-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/newyears-eve/newyears-eve-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/newyears-eve/newyears-eve-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Fireworks Show!")
      .setDescription(`Click the 🎆 to launch fireworks and celebrate!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.fireworksImages[Math.floor(Math.random() * this.fireworksImages.length)])
      .setFooter({ text: "Hurry! Launch as many fireworks as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.fireworksshow.firework"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-1"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-2"),
      await ctx.manager.components.createInstance("minigame.fireworksshow.empty-3")
    ];

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: FIREWORKS_SHOW_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await safeEdit(ctx, await buildTreeDisplayMessage(ctx));
    }, FIREWORKS_SHOW_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleFireworkButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    ctx.game.size += 2;
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You launched a spectacular fireworks show! Your tree grew 2ft taller!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/newyears-eve/newyears-eve-2.jpg"
      );

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, { success: true, difficulty: 1, maxDuration: FIREWORKS_SHOW_MINIGAME_MAX_DURATION });
    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, You missed the fireworks. Better luck next time!`);

    safeReply(
      ctx,
      new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
    );
    await minigameFinished(ctx, {
      success: false,
      difficulty: 1,
      maxDuration: FIREWORKS_SHOW_MINIGAME_MAX_DURATION,
      failureReason: "Wrong button"
    });
    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.fireworksshow.firework",
      new ButtonBuilder().setEmoji({ name: "🎆" }).setStyle(getRandomButtonStyle()),
      FireworksShowMinigame.handleFireworkButton
    ),
    new Button(
      "minigame.fireworksshow.empty-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      FireworksShowMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.fireworksshow.empty-2",
      new ButtonBuilder().setEmoji({ name: "🎇" }).setStyle(getRandomButtonStyle()),
      FireworksShowMinigame.handleEmptyButton
    ),
    new Button(
      "minigame.fireworksshow.empty-3",
      new ButtonBuilder().setEmoji({ name: "🎉" }).setStyle(getRandomButtonStyle()),
      FireworksShowMinigame.handleEmptyButton
    )
  ];
}
