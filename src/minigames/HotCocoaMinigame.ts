// src/minigames/HotCocoaMinigame.ts

import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

const HOT_COCOA_MINIGAME_MAX_DURATION = 10 * 1000;

export class HotCocoaMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: true
  };

  private hotCocoaImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/hot-cocoa/hot-cocoa-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Hot Cocoa Making!")
      .setDescription("Click the ☕ to make hot cocoa. Avoid the spilled cocoa!")
      .setImage(this.hotCocoaImages[Math.floor(Math.random() * this.hotCocoaImages.length)])
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

  public static buttons = [
    new Button(
      "minigame.hotcocoa.hotcocoa",
      new ButtonBuilder().setEmoji({ name: "☕" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        if (!ctx.game) throw new Error("Game data missing.");
        ctx.game.size++;
        await ctx.game.save();

        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("This hot cocoa is delicious! Your tree has grown!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    ),
    new Button(
      "minigame.hotcocoa.spilledcocoa",
      new ButtonBuilder().setEmoji({ name: "🍫" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You spilled the cocoa! Better luck next time!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    )
  ];
}
