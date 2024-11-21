import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";

const SNOWBALL_FIGHT_MINIGAME_MAX_DURATION = 10 * 1000;

export class SnowballFightMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private snowballImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/snowball-fight/snowball-fight-1.png"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Snowball Fight!")
      .setDescription(
        `Click the ❄️ to throw a snowball at the target. Avoid missing the target!${getPremiumUpsellMessage(ctx)}`
      )
      .setImage(this.snowballImages[Math.floor(Math.random() * this.snowballImages.length)])
      .setFooter({ text: "Hurry! Throw as many snowballs as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.snowballfight.snowball"),
      await ctx.manager.components.createInstance("minigame.snowballfight.miss-1"),
      await ctx.manager.components.createInstance("minigame.snowballfight.miss-2"),
      await ctx.manager.components.createInstance("minigame.snowballfight.miss-3")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      disposeActiveTimeouts(ctx);
      SnowballFightMinigame.handleMissButton(ctx, true);
    }, SNOWBALL_FIGHT_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleSnowballButton(ctx: ButtonContext): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const randomOutcome = Math.random();
    let message;

    if (randomOutcome < 0.5) {
      ctx.game.size++;
      message = "Bullseye! You hit the target with a snowball and your tree grew 1ft taller!";
    } else {
      message = "You threw a snowball but missed the target. Better luck next time!";
    }

    await ctx.game.save();

    const embed = new EmbedBuilder().setTitle(ctx.game.name).setDescription(message);
    await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    await minigameFinished(ctx, { success: true, difficulty: 1, maxDuration: SNOWBALL_FIGHT_MINIGAME_MAX_DURATION });

    transitionToDefaultTreeView(ctx);
  }

  private static async handleMissButton(ctx: ButtonContext, isTimeout = false): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`You missed the target. Better luck next time!`);

    if (isTimeout) {
      await minigameFinished(ctx, {
        success: true,
        difficulty: 1,
        maxDuration: SNOWBALL_FIGHT_MINIGAME_MAX_DURATION,
        failureReason: "Timeout"
      });
      await ctx.edit(new MessageBuilder().addEmbed(embed).setComponents([]));
    } else {
      await minigameFinished(ctx, {
        success: true,
        difficulty: 1,
        maxDuration: SNOWBALL_FIGHT_MINIGAME_MAX_DURATION,
        failureReason: "Wrong button"
      });
      await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    }

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.snowballfight.snowball",
      new ButtonBuilder().setEmoji({ name: "❄️" }).setStyle(getRandomButtonStyle()),
      SnowballFightMinigame.handleSnowballButton
    ),
    new Button(
      "minigame.snowballfight.miss-1",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(getRandomButtonStyle()),
      SnowballFightMinigame.handleMissButton
    ),
    new Button(
      "minigame.snowballfight.miss-2",
      new ButtonBuilder().setEmoji({ name: "🎅" }).setStyle(getRandomButtonStyle()),
      SnowballFightMinigame.handleMissButton
    ),
    new Button(
      "minigame.snowballfight.miss-3",
      new ButtonBuilder().setEmoji({ name: "⛄" }).setStyle(getRandomButtonStyle()),
      SnowballFightMinigame.handleMissButton
    )
  ];
}
