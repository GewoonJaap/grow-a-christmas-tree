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
import { FestiveImageStyle } from "../../../util/types/api/ImageStylesApi/FestiveStyleResponseType";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

const COSMETIC_IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/cosmetic/premium-style-tree-1.png",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/cosmetic/premium-style-tree-2.png",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/cosmetic/premium-style-tree-3.png",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/cosmetic/premium-style-tree-4.png",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/cosmetic/premium-style-tree-5.png"
];

const TREE_STYLE_COST = 1500;

type CosmeticsButtonState = {
  page: number;
};

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
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Random Tree Style"),
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
    ),
    new Button(
      "cosmetics.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2).setLabel("Next"),
      async (ctx: ButtonContext<CosmeticsButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return ctx.reply(await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "cosmetics.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2).setLabel("Back"),
      async (ctx: ButtonContext<CosmeticsButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return ctx.reply(await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.buy.festive_style_1",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Festive Style 1"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.handleFestiveTreeStylePurchase(ctx, 0));
      }
    ),
    new Button(
      "shop.cosmetics.buy.festive_style_2",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Festive Style 2"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await this.handleFestiveTreeStylePurchase(ctx, 1));
      }
    )
  ];

  private isStateValid(state: CosmeticsButtonState | undefined): boolean {
    if (!state) return false;
    if (isNaN(state.page)) return false;
    if (state.page < 0) return false;
    return true;
  }

  public async buildCosmeticsMessage(
    ctx: SlashCommandContext | ButtonContext<CosmeticsButtonState>
  ): Promise<MessageBuilder> {
    const state: CosmeticsButtonState =
      ctx instanceof SlashCommandContext || !this.isStateValid(ctx.state)
        ? { page: 1 }
        : (ctx.state as CosmeticsButtonState);

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Cosmetics Shop** 🎁")
      .setDescription("🎄 Unlock magical tree styles to make your tree the star of the season! 🌟")
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      .setFooter({ text: `Page ${state.page}/${Math.ceil((await this.getFestiveTreeStyles()).length / 2)}` });

    const festiveStyles = await this.getFestiveTreeStyles();
    const stylesPerPage = 2;
    const start = (state.page - 1) * stylesPerPage;
    const paginatedStyles = festiveStyles.slice(start, start + stylesPerPage);

    const fields = [
      {
        name: "Random Tree Style 🎄",
        value: `**Effect:** Unlocks a random tree style\n**Cost:** ${TREE_STYLE_COST} coins`,
        inline: false
      }
    ];

    paginatedStyles.forEach((style, index) => {
      const isUnlocked = ctx.game?.unlockedTreeStyles.includes(style.name);
      fields.push({
        name: `${index + 1}. ${style.name} 🎄`,
        value: `**Effect:** ${style.description}\n**Cost:** ${style.cost} coins\n${
          isUnlocked ? "✅ Unlocked" : ""
        }`,
        inline: false
      });
    });

    embed.addFields(fields);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.buy.tree_style"),
      ...(await Promise.all(
        paginatedStyles
          .map((style, index) => ctx.manager.components.createInstance(`shop.cosmetics.buy.festive_style_${index + 1}`))
      )),
      await ctx.manager.components.createInstance("shop.main")
    );

    if (state.page > 1) {
      actionRow.addComponents(await ctx.manager.components.createInstance("cosmetics.back", state));
    }

    if (festiveStyles.length > start + stylesPerPage) {
      actionRow.addComponents(await ctx.manager.components.createInstance("cosmetics.next", state));
    }

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  public async handleTreeStylePurchase(ctx: ButtonContext, style?: FestiveImageStyle): Promise<MessageBuilder> {
    if (!ctx.game || ctx.isDM) {
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("Please use /plant to plant a tree first.")
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    const cost = style ? style.cost : TREE_STYLE_COST;
    const styleName = style ? style.name : (await getRandomLockedTreeStyle(ctx))?.name;

    if (!styleName || ctx.game.unlockedTreeStyles.includes(styleName)) {
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
            .setImage(getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0])
        )
        .addComponents(actionRow);
    }

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < cost) {
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );

      if (!process.env.DEV_MODE) {
        actionRow.addComponents(PremiumButtons.LuckyCoinBagButton);
      }
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Not Enough Coins! ❄️")
            .setDescription(
              `You need **${cost}** coins to purchase the **${styleName}** tree style. Keep earning and come back soon! 🎄`
            )
            .setImage(getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0])
        )
        .addComponents(actionRow);
    }

    await WalletHelper.removeCoins(ctx.user.id, cost);

    ctx.game.unlockedTreeStyles.push(styleName);
    await ctx.game.save();

    const embed = await this.getTreeStyleEmbed(styleName);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );

    this.transitionBackToDefaultShopViewWithTimeout(ctx, 8 * 1000);

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  public async handleFestiveTreeStylePurchase(ctx: ButtonContext, index: number): Promise<MessageBuilder> {
    const festiveStyles = await this.getFestiveTreeStyles();
    if (festiveStyles.length <= index || festiveStyles[index] === undefined) {
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Purchase Failed! ❄️")
            .setDescription(`This style is no longer available! 🎄 Check back later for more festive styles! ✨`)
            .setImage(getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0])
        )
        .addComponents(actionRow);
    }
    const style = festiveStyles[index];

    return this.handleTreeStylePurchase(ctx, style);
  }

  private async getTreeImageUrl(styleName: string): Promise<string> {
    const imageStyleApi = new ImageStylesApi();
    const hasImageResponse = await imageStyleApi.hasImageStyleImage(styleName);

    let imageUrl = getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0];
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

  private async getFestiveTreeStyles(): Promise<FestiveImageStyle[]> {
    const imageStyleApi = new ImageStylesApi();
    const response = await imageStyleApi.getFestiveImageStyles();
    return response.success ? response.styles : [];
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
