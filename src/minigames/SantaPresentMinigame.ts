// src/minigames/SantaPresentMinigame.ts

import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const SANTA_MINIGAME_MAX_DURATION = 10 * 1000;

export class SantaPresentMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Santa is here!")
      .setDescription("Click the 🎁 to give your tree an extra boost!. But avoid the 🧙!")
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/santa-present/santa-present-minigame.jpg"
      )
      .setFooter({ text: "Hurry! Before you know santa will be gone!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.present"),
      await ctx.manager.components.createInstance("minigame.witch")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeout = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, SANTA_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeout);
  }
}
