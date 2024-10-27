import { ButtonContext, EmbedBuilder, MessageBuilder, ActionRowBuilder, Button, ButtonBuilder } from "interactions.ts";
import { shuffleArray } from "../util/helpers/arrayHelper";
import { buildTreeDisplayMessage, transitionToDefaultTreeView } from "../commands/Tree";
import { Minigame, MinigameConfig } from "../util/types/minigame/MinigameType";

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
      .setDescription("Click the ❄️ to throw a snowball at the target. Avoid missing the target!")
      .setImage(this.snowballImages[Math.floor(Math.random() * this.snowballImages.length)])
      .setFooter({ text: "Hurry! Throw as many snowballs as you can!" });

    const buttons = [
      await ctx.manager.components.createInstance("minigame.snowballfight.snowball"),
      await ctx.manager.components.createInstance("minigame.snowballfight.miss")
    ];

    shuffleArray(buttons);

    const message = new MessageBuilder().addComponents(new ActionRowBuilder().addComponents(...buttons));

    message.addEmbed(embed);

    await ctx.reply(message);

    const timeoutId = setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction.message.id);
      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, SNOWBALL_FIGHT_MINIGAME_MAX_DURATION);

    ctx.timeouts.set(ctx.interaction.message.id, timeoutId);
  }

  public static buttons = [
    new Button(
      "minigame.snowballfight.snowball",
      new ButtonBuilder().setEmoji({ name: "❄️" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);

        if (!ctx.game) throw new Error("Game data missing.");

        const randomOutcome = Math.random();
        let message;

        if (randomOutcome < 0.5) {
          ctx.game.size++;
          message = "Bullseye! You hit the target with a snowball and your tree grew taller!";
        } else {
          message = "You threw a snowball but missed the target. Better luck next time!";
        }

        await ctx.game.save();

        const embed = new EmbedBuilder().setTitle(ctx.game.name).setDescription(message);
        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    ),
    new Button(
      "minigame.snowballfight.miss",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(4),
      async (ctx: ButtonContext): Promise<void> => {
        const timeout = ctx.timeouts.get(ctx.interaction.message.id);
        if (timeout) clearTimeout(timeout);
        ctx.timeouts.delete(ctx.interaction.message.id);
        if (!ctx.game) throw new Error("Game data missing.");
        const embed = new EmbedBuilder()
          .setTitle(ctx.game.name)
          .setDescription("You missed the target. Better luck next time!");

        ctx.reply(new MessageBuilder().addEmbed(embed).setComponents([]));

        transitionToDefaultTreeView(ctx);
      }
    )
  ];
}
