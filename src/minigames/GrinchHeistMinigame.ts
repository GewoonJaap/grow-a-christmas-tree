import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

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
      .setDescription("Click the tree to save it from the Grinch. Avoid the Grinch!")
      .setImage(this.grinchImages[Math.floor(Math.random() * this.grinchImages.length)])
      .setFooter({ text: "Hurry! Save your tree before it's too late! Enjoy unlimited levels, fun minigames and more via the shop!" });

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
      ctx.timeouts.delete(ctx.interaction.message.id);
      await GrinchHeistMinigame.handleGrinchButton(ctx);
    }, GRINCH_HEIST_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  private static async handleGrinchButton(ctx: ButtonContext): Promise<void> {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);
    ctx.timeouts.delete(ctx.interaction.message.id);

    if (!ctx.game) throw new Error("Game data missing.");
    const loss = Math.min(5, Math.floor(ctx.game.size * 0.1));
    ctx.game.size = Math.max(0, ctx.game.size - loss);
    await ctx.game.save();

    const embed = new EmbedBuilder()
      .setTitle(ctx.game.name)
      .setDescription(`The Grinch stole part of your tree! You lost ${loss}ft.`);

    ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

    transitionToDefaultTreeView(ctx);
  }

  public static buttons = [
    new Button(
      "minigame.grinchheist.tree",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        if (!ctx.game) throw new Error("Game data missing.");
        ctx.game.size++;
        await ctx.game.save();

        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You saved the tree! Your tree grew taller!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    ),
    new Button(
      "minigame.grinchheist.grinch-1",
      new ButtonBuilder().setEmoji({ name: "😈" }).setStyle(4),
      GrinchHeistMinigame.handleGrinchButton
    ),
    new Button(
      "minigame.grinchheist.grinch-2",
      new ButtonBuilder().setEmoji({ name: "😈" }).setStyle(4),
      GrinchHeistMinigame.handleGrinchButton
    ),
    new Button(
      "minigame.grinchheist.grinch-3",
      new ButtonBuilder().setEmoji({ name: "😈" }).setStyle(4),
      GrinchHeistMinigame.handleGrinchButton
    )
  ];
}
