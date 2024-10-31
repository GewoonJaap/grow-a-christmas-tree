import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage } from "./MinigameFactory";

const GIFT_UNWRAPPING_MINIGAME_MAX_DURATION = 10 * 1000;

export class GiftUnwrappingMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private giftImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-unwrapping-1.png",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-unwrapping-2.png"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Gift Unwrapping!")
      .setDescription(`Click the 🎁 to unwrap a present. Avoid the empty boxes!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.giftImages[Math.floor(Math.random() * this.giftImages.length)])
      .setFooter({ text: "Hurry! Unwrap as many gifts as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.giftunwrapping.gift"),
      await ctx.manager.components.createInstance("minigame.giftunwrapping.emptybox-1"),
      await ctx.manager.components.createInstance("minigame.giftunwrapping.emptybox-2"),
      await ctx.manager.components.createInstance("minigame.giftunwrapping.emptybox-3")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, GIFT_UNWRAPPING_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleGiftButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");

    const randomOutcome = Math.random();
    let message;

    if (randomOutcome < 0.33) {
      ctx.game.lastWateredAt = 0;
      message = "You unwrapped a gift and found a magical watering can! Your tree can be watered again.";
    } else if (randomOutcome < 0.66) {
      ctx.game.size += 2;
      message = "You unwrapped a gift and found a special fertilizer! Your tree grew extra tall.";
    } else {
      message = "You unwrapped a gift but found nothing special inside.";
    }

    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(message)
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-unwrapping-1.png"
      );
    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  private static async handleEmptyBoxButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");

    if (!ctx.game) throw new Error("Game data missing.");

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription("You unwrapped an empty box. Better luck next time!");
    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.giftunwrapping.gift",
      new ButtonBuilder().setEmoji({ name: "🎁" }).setStyle(1),
      GiftUnwrappingMinigame.handleGiftButton
    ),
    new Button(
      "minigame.giftunwrapping.emptybox-1",
      new ButtonBuilder().setEmoji({ name: "📦" }).setStyle(4),
      GiftUnwrappingMinigame.handleEmptyBoxButton
    ),
    new Button(
      "minigame.giftunwrapping.emptybox-2",
      new ButtonBuilder().setEmoji({ name: "📦" }).setStyle(4),
      GiftUnwrappingMinigame.handleEmptyBoxButton
    ),
    new Button(
      "minigame.giftunwrapping.emptybox-3",
      new ButtonBuilder().setEmoji({ name: "📦" }).setStyle(4),
      GiftUnwrappingMinigame.handleEmptyBoxButton
    )
  ];
}
