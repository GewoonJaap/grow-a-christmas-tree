import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";
import { getPremiumUpsellMessage, minigameFinished } from "./MinigameFactory";

const GRINCH_HEIST_MINIGAME_MAX_DURATION = 10 * 1000;

export class GrinchHeistMinigame implements Minigame {
  config: MinigameConfig = {
    premiumGuildOnly: false
  };

  private grinchImages = [
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-1.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-2.jpg",
    "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-heist-3.jpg"
  ];

  async start(ctx: ButtonContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Grinch Heist!")
      .setDescription(`Click the tree to save it from the Grinch. Avoid the Grinch!${getPremiumUpsellMessage(ctx)}`)
      .setImage(this.grinchImages[Math.floor(Math.random() * this.grinchImages.length)])
      .setFooter({
        text: "Hurry! The Grinch is coming! You have 10 seconds to save your tree!"
      });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.grinchheist.tree"),
      await ctx.manager.components.createInstance("minigame.grinchheist.grinch-1"),
      await ctx.manager.components.createInstance("minigame.grinchheist.grinch-2"),
      await ctx.manager.components.createInstance("minigame.grinchheist.grinch-3")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
      await GrinchHeistMinigame.handleGrinchButton(ctx, true);
    }, GRINCH_HEIST_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleGrinchButton(ctx: ButtonContext, isTimeout = false): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");

    if (!ctx.game) throw new Error("Game data missing.");
    const randomLoss = Math.floor(Math.random() * Math.min(5, Math.floor(ctx.game.size * 0.1))) + 1;
    ctx.game.size = Math.max(0, ctx.game.size - randomLoss);
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`The Grinch stole part of your tree! You lost ${randomLoss}ft.`)
      .setImage(
        "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-stole-tree-1.jpg"
      );

    if (isTimeout) {
      await ctx.edit(new MessageBuilder().addEmbed(embed).setComponents([]));
    } else {
      await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));
    }

    transitionToDefaultTreeView(ctx);

    await minigameFinished(ctx, false, 1, GRINCH_HEIST_MINIGAME_MAX_DURATION);
  }

  public static buttons = [
    new Button(
      "minigame.grinchheist.tree",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");

        if (!ctx.game) throw new Error("Game data missing.");
        ctx.game.size++;
        await ctx.game.save();

        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You saved the tree! Your tree grew 1ft taller!")
          .setImage(
            "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/minigame/grinch-heist/grinch-tree-saved-1.jpg"
          );

        await ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);

        await minigameFinished(ctx, true, 1, GRINCH_HEIST_MINIGAME_MAX_DURATION);
      }
    ),
    new Button(
      "minigame.grinchheist.grinch-1",
      new ButtonBuilder().setEmoji({ name: "😈" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    ),
    new Button(
      "minigame.grinchheist.grinch-2",
      new ButtonBuilder().setEmoji({ name: "🎃" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    ),
    new Button(
      "minigame.grinchheist.grinch-3",
      new ButtonBuilder().setEmoji({ name: "👽" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        GrinchHeistMinigame.handleGrinchButton(ctx, false);
      }
    )
  ];
}
