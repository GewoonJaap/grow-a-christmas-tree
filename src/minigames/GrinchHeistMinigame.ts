import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { getRandomElement, getRandomElements, shuffleArray } from "../util/helpers/arrayHelper";
import { disposeActiveTimeouts, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";
import { toFixed } from "../util/helpers/numberHelper";
import { getRandomButtonStyle } from "../util/discord/DiscordApiExtensions";
import { getRandomEmojiWithExclusion, SPOOKY_EMOJIS } from "../util/emoji";
import { safeReply, safeEdit } from "../util/discord/MessageExtenstions";

const GRINCH_HEIST_MINIGAME_MAX_DURATION = 10 * 1000;
const BUTTON_FAIL_EMOJIS = getRandomElements(SPOOKY_EMOJIS, 3);
const BUTTON_SUCCESS_EMOJI = getRandomEmojiWithExclusion(BUTTON_FAIL_EMOJIS);

const GRINCH_BUTTON_NAMES = [
  `minigame.grinchheist.grinch-1`,
  `minigame.grinchheist.grinch-2`,
  `minigame.grinchheist.grinch-3`,
  `minigame.grinchheist.grinch-4`
];

type GrinchHeistButtonState = {
  isPenalty: boolean;
};

export class GrinchHeistMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private grinchImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-3.jpg"
  ];

  async start(ctx: ButtonContext, isPenalty = false): Promise<void> {
    const EMBED_DESCRIPTIONS = [
      `Whoah! The Grinch is trying to steal your tree! Click the ${BUTTON_SUCCESS_EMOJI} to save it! But be careful! Don't click the ${getRandomElement(
        BUTTON_FAIL_EMOJIS
      )}${getPremiumUpsellMessage(ctx)}`,
      `Watch out for the ${getRandomElement(
        BUTTON_FAIL_EMOJIS
      )}. The Grinch is nearby! Hit the ${BUTTON_SUCCESS_EMOJI}${getPremiumUpsellMessage(ctx)}`,
      `Hurry! The Grinch is here! Click the ${BUTTON_SUCCESS_EMOJI} to save your tree! Avoid clicking the ${getRandomElement(
        BUTTON_FAIL_EMOJIS
      )}${getPremiumUpsellMessage(ctx)}`,
      `Save your tree from the Grinch! Click the ${BUTTON_SUCCESS_EMOJI} now! But watch out for the ${getRandomElement(
        BUTTON_FAIL_EMOJIS
      )}${getPremiumUpsellMessage(ctx)}`,
      `The Grinch is coming! Click the ${BUTTON_SUCCESS_EMOJI} to protect your tree! Don't click the ${getRandomElement(
        BUTTON_FAIL_EMOJIS
      )}${getPremiumUpsellMessage(ctx)}`
    ];

    const embed = new EmbedBuilder()
      .setTitle("Grinch Heist!")
      .setDescription(getRandomElement(EMBED_DESCRIPTIONS) ?? EMBED_DESCRIPTIONS[0])
      .setImage(this.grinchImages[Math.floor(Math.random() * this.grinchImages.length)])
      .setFooter({
        text: "Hurry! The Grinch is coming! You have 10 seconds to save your tree!"
      });

    const buttons = [
      await ctx.manager.components.createInstance(GRINCH_BUTTON_NAMES[0], { isPenalty }),
      await ctx.manager.components.createInstance(GRINCH_BUTTON_NAMES[1], { isPenalty }),
      await ctx.manager.components.createInstance(GRINCH_BUTTON_NAMES[2], { isPenalty }),
      await ctx.manager.components.createInstance(GRINCH_BUTTON_NAMES[3], { isPenalty })
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await safeReply(ctx, message);

    const timeoutId = setTimeout(async () => {
      await GrinchHeistMinigame.handleGrinchButton(ctx, true);
    }, GRINCH_HEIST_MINIGAME_MAX_DURATION);
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleGrinchButton(
    ctx: ButtonContext<GrinchHeistButtonState>,
    isTimeout = false
  ): Promise<void> {
    disposeActiveTimeouts(ctx);

    if (!ctx.game) throw new Error("Game data missing.");
    let randomLoss = Math.floor(Math.random() * Math.min(5, Math.floor(ctx.game.size * 0.1))) + 1;
    if (ctx.state?.isPenalty) {
      randomLoss += 5;
    }
    ctx.game.size = toFixed(Math.max(0, ctx.game.size - randomLoss), 2);
    await ctx.game.save();

    const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`<@${ctx.user.id}>, The Grinch stole part of your tree! You lost ${randomLoss}ft.`)
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-stole-tree-1.jpg"
      );

    if (isTimeout) {
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: GRINCH_HEIST_MINIGAME_MAX_DURATION,
        failureReason: "Timeout",
        minigameName: "Grinch Heist"
      });
      await safeEdit(
        ctx,
        new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
      );
    } else {
      await minigameFinished(ctx, {
        success: false,
        difficulty: 1,
        maxDuration: GRINCH_HEIST_MINIGAME_MAX_DURATION,
        failureReason: "Wrong button",
        minigameName: "Grinch Heist"
      });
      await safeReply(
        ctx,
        new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
      );
    }

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      GRINCH_BUTTON_NAMES[0],
      new ButtonBuilder().setEmoji({ name: BUTTON_SUCCESS_EMOJI }).setStyle(getRandomButtonStyle()),
      async (ctx: ButtonContext<GrinchHeistButtonState>): Promise<void> => {
        disposeActiveTimeouts(ctx);

        if (!ctx.game) throw new Error("Game data missing.");

        if (!ctx.state?.isPenalty) {
          ctx.game.size++;
          await ctx.game.save();
        }

        const buttons = [await ctx.manager.components.createInstance("minigame.refresh")];

        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription(`You saved the tree!${ctx.state?.isPenalty ? "" : " Your tree grew 1ft taller!"}`)
          .setImage(
            "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-tree-saved-1.jpg"
          );

        await safeReply(
          ctx,
          new MessageBuilder().addEmbed(embed).addComponents(new ActionRowBuilder().addComponents(...buttons))
        );

        transitionToDefaultTreeView(ctx);

        await minigameFinished(ctx, {
          success: true,
          difficulty: 1,
          maxDuration: GRINCH_HEIST_MINIGAME_MAX_DURATION,
          penalty: ctx.state?.isPenalty ?? false,
          minigameName: "Grinch Heist"
        });
      }
    ),
    new Button(
      GRINCH_BUTTON_NAMES[1],
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[0] }).setStyle(getRandomButtonStyle()),
      async (ctx: ButtonContext<GrinchHeistButtonState>): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    ),
    new Button(
      GRINCH_BUTTON_NAMES[2],
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[1] }).setStyle(getRandomButtonStyle()),
      async (ctx: ButtonContext<GrinchHeistButtonState>): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    ),
    new Button(
      GRINCH_BUTTON_NAMES[3],
      new ButtonBuilder().setEmoji({ name: BUTTON_FAIL_EMOJIS[2] }).setStyle(getRandomButtonStyle()),
      async (ctx: ButtonContext<GrinchHeistButtonState>): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    )
  ];
}
