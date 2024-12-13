import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  ComponentManager,
  EmbedBuilder,
  MessageBuilder,
  SlashCommandContext
} from "interactions.ts";
import { PremiumButtons } from "../../../util/buttons/PremiumButtons";
import { getRandomElement } from "../../../util/helpers/arrayHelper";
import { WalletHelper } from "../../../util/wallet/WalletHelper";
import { disposeActiveTimeouts } from "../../Tree";
import { PartialCommand } from "../../../util/types/command/PartialCommandType";
import { DynamicButtonsCommandType } from "../../../util/types/command/DynamicButtonsCommandType";
import { ImageStylesApi } from "../../../util/api/image-styles/ImageStyleApi";
import { FestiveImageStyle } from "../../../util/types/api/ImageStylesApi/FestiveStyleResponseType";
import { StyleItemShopApi } from "../../../util/api/item-shop/StyleItemShopApi";
import { ItemShopStyleItem, StyleItemRarity } from "../../../util/types/api/ItemShopApi/DailyItemShopResponseType";
import { ImageStyle } from "../../../util/types/api/ImageStylesApi/ImageStylesResponseType";
import { TreeStyleHelper } from "../../../util/tree-styles/TreeStyleHelper";

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
const STYLES_PER_PAGE = 2;

const imageStyleApi = new ImageStylesApi();
const styleItemShopApi = new StyleItemShopApi();

type CosmeticsButtonState = {
  page: number;
};

export class Cosmetics implements PartialCommand, DynamicButtonsCommandType {
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
        const style = await TreeStyleHelper.getRandomLockedTreeStyle(ctx);
        return ctx.reply(await this.handleStylePurchase(ctx, style));
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
    )
  ];

  private isStateValid(state: CosmeticsButtonState | undefined): boolean {
    return state !== undefined && !isNaN(state.page) && state.page >= 0;
  }

  public async registerDynamicButtons(componentManager: ComponentManager): Promise<void> {
    const allStyles = await this.getAllStyles();
    await this.registerStyleButtons(componentManager, allStyles);
  }

  private async registerStyleButtons(
    componentManager: ComponentManager,
    styles: (FestiveImageStyle | ItemShopStyleItem)[]
  ): Promise<void> {
    const buttons = styles.map((style, index) => {
      const buttonId = `shop.cosmetics.buy.style_${index + 1}`;
      return new Button(
        buttonId,
        new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel(`Buy ${style.name}`),
        async (ctx: ButtonContext): Promise<void> => {
          return ctx.reply(await this.handleStylePurchase(ctx, style));
        }
      );
    });

    const newButtons = buttons.filter((button) => !componentManager.has(button.id));
    componentManager.register(newButtons);
  }

  public async buildCosmeticsMessage(
    ctx: SlashCommandContext | ButtonContext<CosmeticsButtonState>
  ): Promise<MessageBuilder> {
    const state: CosmeticsButtonState =
      ctx instanceof SlashCommandContext || !this.isStateValid(ctx.state)
        ? { page: 1 }
        : (ctx.state as CosmeticsButtonState);

    const allStyles = await this.getAllStyles();
    const paginatedStyles = this.paginateStyles(allStyles, state.page);

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Cosmetics Shop** 🎁")
      .setDescription("🎄 Unlock magical tree styles to make your tree the star of the season! 🌟")
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      .setFooter({ text: `Page ${state.page}/${Math.ceil(allStyles.length / STYLES_PER_PAGE)}` });

    const fields = this.buildFields(paginatedStyles, state.page, ctx);
    embed.addFields(fields);

    const actionRow = new ActionRowBuilder().addComponents(
      ...(state.page === 1 ? [await ctx.manager.components.createInstance("shop.cosmetics.buy.tree_style")] : []),
      ...(await Promise.all(
        paginatedStyles.map((style, index) =>
          ctx.manager.components.createInstance(
            `shop.cosmetics.buy.style_${(state.page - 1) * STYLES_PER_PAGE + index + 1}`
          )
        )
      )),
      await ctx.manager.components.createInstance("shop.main")
    );

    if (state.page > 1) {
      actionRow.addComponents(await ctx.manager.components.createInstance("cosmetics.back", state));
    }

    if (allStyles.length > state.page * STYLES_PER_PAGE) {
      actionRow.addComponents(await ctx.manager.components.createInstance("cosmetics.next", state));
    }

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private paginateStyles(
    styles: (FestiveImageStyle | ItemShopStyleItem)[],
    page: number
  ): (FestiveImageStyle | ItemShopStyleItem)[] {
    const start = (page - 1) * STYLES_PER_PAGE;
    return styles.slice(start, start + STYLES_PER_PAGE);
  }

  private buildFields(
    styles: (FestiveImageStyle | ItemShopStyleItem)[],
    page: number,
    ctx: SlashCommandContext | ButtonContext<unknown>
  ): { name: string; value: string; inline: boolean }[] {
    const fields = [];

    if (page === 1) {
      fields.push({
        name: "Random Tree Style 🎄",
        value: `**Effect:** Unlocks a random tree style\n**Cost:** ${TREE_STYLE_COST} coins`,
        inline: false
      });
    }

    styles.forEach((style, index) => {
      const isUnlocked = TreeStyleHelper.hasStyleUnlocked(ctx, style.name);
      const rarity = "rarity" in style ? `**Rarity:** ${style.rarity}\n` : "";
      fields.push({
        name: `${index + 1}. ${style.name} 🎄`,
        value: `${rarity}**Effect:** ${style.description}\n**Cost:** ${style.cost} coins\n${
          isUnlocked ? "✅ Unlocked" : ""
        }`,
        inline: false
      });
    });

    return fields;
  }

  public async handleStylePurchase(
    ctx: ButtonContext,
    style: FestiveImageStyle | ItemShopStyleItem | ImageStyle | null
  ): Promise<MessageBuilder> {
    if (!ctx.game || ctx.isDM) {
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("Please use /plant to plant a tree first.")
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    if (!ctx.game.hasAiAccess) {
      return this.buildPurchaseFailedMessage(
        ctx,
        "This premium feature is part of the Festive Forest subscription! Upgrade now to enjoy exclusive perks and watch your Christmas tree thrive like never before! 🎅✨",
        true
      );
    }

    if (!style) {
      return this.buildPurchaseFailedMessage(
        ctx,
        "It looks like this style is no longer available! 🎄 Check back later for more festive styles! ✨"
      );
    }

    const allStyles = await this.getAllStyles();
    const defaultStyles = await imageStyleApi.getImageStyles();

    const styleAvailable =
      defaultStyles.styles.some((x) => x.name === style.name) || allStyles.some((x) => x.name === style.name);

    if (!styleAvailable) {
      return this.buildPurchaseFailedMessage(
        ctx,
        "It looks like this style is no longer available! 🎄 Check back later for more festive styles! ✨"
      );
    }

    const cost = "cost" in style ? style.cost : TREE_STYLE_COST;
    const styleName = style.name;

    if (TreeStyleHelper.hasStyleUnlocked(ctx, styleName)) {
      return this.buildPurchaseFailedMessage(
        ctx,
        "It looks like you've already unlocked all the available styles! 🎄 Check back later for more festive styles! ✨"
      );
    }

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < cost) {
      return this.buildNotEnoughCoinsMessage(ctx, cost, styleName);
    }

    await WalletHelper.removeCoins(ctx.user.id, cost);

    await TreeStyleHelper.addNewStyle(ctx, styleName);

    const embed = await this.getTreeStyleEmbed(styleName);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );

    this.transitionBackToDefaultShopViewWithTimeout(ctx, 8 * 1000);

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private async getTreeImageUrl(styleName: string): Promise<string> {
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
    const response = await imageStyleApi.getFestiveImageStyles();
    return response.success ? response.styles : [];
  }

  private async getItemShopStyles(): Promise<Record<StyleItemRarity, ItemShopStyleItem[]>> {
    const response = await styleItemShopApi.getDailyItemShopStyles();
    return response.items;
  }

  private async getAllStyles(): Promise<(FestiveImageStyle | ItemShopStyleItem)[]> {
    const festiveStyles = await this.getFestiveTreeStyles();
    const itemShopStyles = await this.getItemShopStyles();
    const flatItemShop = Object.values(itemShopStyles).flat();
    return [...festiveStyles, ...flatItemShop];
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

  private async buildPurchaseFailedMessage(
    ctx: ButtonContext,
    description: string,
    showPremiumButton = false
  ): Promise<MessageBuilder> {
    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );
    if (showPremiumButton && !process.env.DEV_MODE) {
      actionRow.addComponents(PremiumButtons.FestiveForestButton);
    }
    this.transitionBackToDefaultShopViewWithTimeout(ctx);
    return new MessageBuilder()
      .addEmbed(
        new EmbedBuilder()
          .setTitle("🎅 Purchase Failed! ❄️")
          .setDescription(description)
          .setImage(getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0])
      )
      .addComponents(actionRow);
  }

  private async buildNotEnoughCoinsMessage(
    ctx: ButtonContext,
    cost: number,
    styleName: string
  ): Promise<MessageBuilder> {
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
}
