import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  MessageBuilder,
  SlashCommandContext
} from "interactions.ts";
import { PremiumButtons } from "../../../util/buttons/PremiumButtons";
import { getRandomElement } from "../../../util/helpers/arrayHelper";
import { getRandomLockedTreeStyle } from "../../../util/helpers/treeStyleHelper";
import { WalletHelper } from "../../../util/wallet/WalletHelper";
import { disposeActiveTimeouts } from "../../Tree";
import { PartialCommand } from "../../../util/types/command/PartialCommandType";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

const TREE_STYLE_COST = 1500;

export class Cosmetics implements PartialCommand {
  public components: Button[] = [
    new Button(
      "shop.cosmetics",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Cosmetics"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "shop.buy.tree_style",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Tree Style"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.handleTreeStylePurchase(ctx));
      }
    )
  ];

  public async buildCosmeticsMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
    const embed = new EmbedBuilder()
      .setTitle("🎄 **Cosmetics Shop** 🎁")
      .setDescription("🎄 Unlock magical tree styles to make your tree the star of the season! 🌟")
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0]);

    const fields = [
      {
        name: "Tree Style 🎄",
        value: `**Effect:** Unlocks a random tree style\n**Cost:** ${TREE_STYLE_COST} coins`,
        inline: false
      }
    ];

    embed.addFields(fields);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.buy.tree_style"),
      await ctx.manager.components.createInstance("shop.refresh"),
      await ctx.manager.components.createInstance("shop.main")
    );

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  public async handleTreeStylePurchase(ctx: ButtonContext): Promise<MessageBuilder> {
    if (!ctx.game || ctx.isDM) {
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("Please use /plant to plant a tree first.")
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    if (!ctx.game.hasAiAccess) {
      const message = new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("🎅 Purchase Failed! ❄️")
          .setDescription(
            `Sorry, to use this feature you need the Festive Forest Subscription! 🎄 Unlock it to enjoy magical perks and more! ✨`
          )
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
      if (!process.env.DEV_MODE) {
        const actionRow = new ActionRowBuilder().addComponents(PremiumButtons.FestiveForestButton);
        message.addComponents(actionRow);
      }
      return message;
    }

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < TREE_STYLE_COST) {
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("🎅 Not Enough Coins! ❄️")
          .setDescription(
            `You need **${TREE_STYLE_COST}** coins to purchase a tree style. Keep earning and come back soon! 🎄`
          )
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    const randomTreeStyle = await getRandomLockedTreeStyle(ctx);
    if (!randomTreeStyle) {
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("🎅 Purchase Failed! ❄️")
          .setDescription(
            `It looks like you've already unlocked all the available styles! 🎄 Check back later for more festive styles! ✨`
          )
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    ctx.game.unlockedTreeStyles.push(randomTreeStyle.name);
    await ctx.game.save();

    this.transitionBackToDefaultShopViewWithTimeout(ctx);

    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎁 Purchase Complete!")
        .setDescription(
          `You've successfully unlocked the **${randomTreeStyle.name}** tree style! It will appear randomly as you level up! 🎄✨`
        )
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }

  private transitionBackToDefaultShopViewWithTimeout(ctx: ButtonContext, delay = 4000): void {
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(
      ctx.interaction.message.id,
      setTimeout(async () => {
        try {
          disposeActiveTimeouts(ctx);

          await ctx.edit(await this.buildCosmeticsMessage(ctx));
        } catch (e) {
          console.log(e);
        }
      }, delay)
    );
  }
}
