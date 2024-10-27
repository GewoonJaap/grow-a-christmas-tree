import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const GIFT_UNWRAPPING_MINIGAME_MAX_DURATION = 10 * 1000;

export class GiftUnwrappingMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private giftImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/gift-unwrapping/gift-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Gift Unwrapping!")
      .setDescription("Click the 🎁 to unwrap a present. Avoid the empty boxes!")
      .setImage(this.giftImages[Math.floor(Math.random() * this.giftImages.length)])
      .setFooter({ text: "Hurry! Unwrap as many gifts as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.giftunwrapping.gift"),
      await ctx.manager.components.createInstance("minigame.giftunwrapping.emptybox")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, GIFT_UNWRAPPING_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }
}
