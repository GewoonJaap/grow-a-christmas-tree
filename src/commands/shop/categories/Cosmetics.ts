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
import { ImageStylesApi } from "../../../util/api/image-styles/ImageStyleApi";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

const TREE_STYLE_COST = 1500;

export class Cosmetics implements PartialCommand {
  public entryButtonName = "shop.cosmetics";

  public components: Button[] = [
    new Button(
      this.entryButtonName,
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Cosmetics"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.buy.tree_style",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Tree Style"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.handleTreeStylePurchase(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.buildCosmeticsMessage(ctx));
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
      await ctx.manager.components.createInstance("shop.cosmetics.buy.tree_style"),
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
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );
      if (!process.env.DEV_MODE) {
        actionRow.addComponents(PremiumButtons.FestiveForestButton);
      }
      message.addComponents(actionRow);
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return message;
    }

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < TREE_STYLE_COST) {
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Not Enough Coins! ❄️")
            .setDescription(
              `You need **${TREE_STYLE_COST}** coins to purchase a tree style. Keep earning and come back soon! 🎄`
            )
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
        )
        .addComponents(actionRow);
    }

    const randomTreeStyle = await getRandomLockedTreeStyle(ctx);
    if (!randomTreeStyle) {
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Purchase Failed! ❄️")
            .setDescription(
              `It looks like you've already unlocked all the available styles! 🎄 Check back later for more festive styles! ✨`
            )
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
        )
        .addComponents(actionRow);
    }

    ctx.game.unlockedTreeStyles.push(randomTreeStyle.name);
    await ctx.game.save();

    const embed = await this.getTreeStyleEmbed(randomTreeStyle.name);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );

    this.transitionBackToDefaultShopViewWithTimeout(ctx);

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private async getTreeImageUrl(styleName: string): Promise<string> {
    const imageStyleApi = new ImageStylesApi();
    const hasImageResponse = await imageStyleApi.hasImageStyleImage(styleName);

    let imageUrl = getRandomElement(IMAGES) ?? IMAGES[0];
    if (hasImageResponse.exists) {
      const imageResponse = await imageStyleApi.getImageStyleImage(styleName);
      if (imageResponse.success) {
        imageUrl = imageResponse.data?.url ?? imageUrl;
      }
    } else {
      imageStyleApi.generateImageStyles();
    }
    return imageUrl;
  }

  private async getTreeStyleEmbed(styleName: string): Promise<EmbedBuilder> {
    const imageUrl = await this.getTreeImageUrl(styleName);

    return new EmbedBuilder()
      .setTitle("🎁 Purchase Complete!")
      .setDescription(
        `You've successfully unlocked the **${styleName}** tree style! It will appear randomly as you level up! 🎄✨`
      )
      .setImage(imageUrl);
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