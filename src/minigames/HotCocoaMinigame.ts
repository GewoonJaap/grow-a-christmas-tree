import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const HOT_COCOA_MINIGAME_MAX_DURATION = 10 * 1000;

export class HotCocoaMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: true
  };

  private cocoaImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Hot Cocoa Making!")
      .setDescription("Santa is thirsty! Click the ☕ to make hot cocoa. Avoid the spilled cocoa!")
      .setImage(this.cocoaImages[Math.floor(Math.random() * this.cocoaImages.length)])
      .setFooter({ text: "Hurry! Make as much hot cocoa as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.hotcocoa.hotcocoa"),
      await ctx.manager.components.createInstance("minigame.hotcocoa.spilledcocoa")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, HOT_COCOA_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }
}
