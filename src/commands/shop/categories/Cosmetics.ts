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
import { StyleItemShopApi, DailyItemShopStylesResult } from "../../../util/api/item-shop/StyleItemShopApi";
import { ItemShopStyleItem } from "../../../util/types/api/ItemShopApi/DailyItemShopResponseType";
import { ImageStyle } from "../../../util/types/api/ImageStylesApi/ImageStylesResponseType";
import { TreeStyleHelper } from "../../../util/tree-styles/TreeStyleHelper";
import { getLocaleFromTimezone } from "../../../util/timezones";
import { safeReply, safeEdit } from "../../../util/discord/MessageExtenstions";
import { SpecialDayHelper } from "../../../util/special-days/SpecialDayHelper";
import { Metrics } from "../../../tracing/metrics"; // Import Metrics
import pino from "pino";

const logger = pino({
  level: "info"
});

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
  public refreshTime = new Date();
  public entryButtonName = "shop.cosmetics";

  public components: Button[] = [
    new Button(
      this.entryButtonName,
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Cosmetics"),
      async (ctx: ButtonContext): Promise<void> => {
        return safeReply(ctx, await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.buy.tree_style",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Buy Random Tree Style"),
      async (ctx: ButtonContext): Promise<void> => {
        const style = await TreeStyleHelper.getRandomLockedTreeStyle(ctx);
        return safeReply(ctx, await this.handleStylePurchase(ctx, style));
      }
    ),
    new Button(
      "shop.cosmetics.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return safeReply(ctx, await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "cosmetics.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2).setLabel("Next"),
      async (ctx: ButtonContext<CosmeticsButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return safeReply(ctx, await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "cosmetics.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2).setLabel("Back"),
      async (ctx: ButtonContext<CosmeticsButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return safeReply(ctx, await this.buildCosmeticsMessage(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.confirm",
      new ButtonBuilder().setEmoji({ name: "✅" }).setStyle(1).setLabel("Yes, Confirm"),
      async (ctx: ButtonContext): Promise<void> => {
        return safeReply(ctx, await this.completeStylePurchase(ctx));
      }
    ),
    new Button(
      "shop.cosmetics.cancel",
      new ButtonBuilder().setEmoji({ name: "❌" }).setStyle(2).setLabel("No, Cancel"),
      async (ctx: ButtonContext): Promise<void> => {
        logger.info(`User ${ctx.user.id} cancelled the purchase.`);
        return safeReply(ctx, await this.buildCosmeticsMessage(ctx));
      }
    )
  ];

  private isStateValid(state: CosmeticsButtonState | undefined): boolean {
    return state !== undefined && !isNaN(state.page) && state.page >= 0;
  }

  public async registerDynamicButtons(componentManager: ComponentManager): Promise<void> {
    const allStyles = await this.getAllStyles(componentManager);
    await this.registerStyleButtons(componentManager, allStyles);
  }

  private async unregisterStyleButtons(
    componentManager: ComponentManager,
    styles: (FestiveImageStyle | ItemShopStyleItem)[]
  ): Promise<void> {
    const buttons = styles.map((_, index) => `shop.cosmetics.buy.style_${index + 1}`);
    buttons.forEach((button) => {
      if (componentManager.has(button)) {
        componentManager.unregister(button);
      }
    });
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
          return safeReply(ctx, await this.handleStylePurchase(ctx, style));
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

    if (!ctx.game || ctx.isDM) {
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("Please use /plant to plant a tree first.")
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    const allStyles = await this.getAllStyles(ctx.manager.components);
    const paginatedStyles = this.paginateStyles(allStyles, state.page);

    const localeTimeString = this.refreshTime.toLocaleString(getLocaleFromTimezone(ctx.game.timeZone), {
      timeZone: ctx.game.timeZone
    });

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Cosmetics Shop** 🎁")
      .setDescription("🎄 Unlock magical tree styles to make your tree the star of the season! 🌟")
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      .setFooter({
        text: `Page ${state.page}/${Math.ceil(
          allStyles.length / STYLES_PER_PAGE
        )} | Item shop refresh: ${localeTimeString}`
      });

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
      return await this.buildPurchaseFailedMessage(
        ctx,
        "This premium feature is part of the Festive Forest subscription! Upgrade now to enjoy exclusive perks and watch your Christmas tree thrive like never before! 🎅✨",
        true
      );
    }

    if (!style) {
      return await this.buildPurchaseFailedMessage(
        ctx,
        "It looks like this style is no longer available! 🎄 Check back later for more festive styles! ✨"
      );
    }

    const allStyles = await this.getAllStyles(ctx.manager.components);
    const defaultStyles = await imageStyleApi.getImageStyles();

    const styleAvailable =
      defaultStyles.styles.some((x) => x.name === style.name) || allStyles.some((x) => x.name === style.name);

    if (!styleAvailable) {
      return await this.buildPurchaseFailedMessage(
        ctx,
        "It looks like this style is no longer available! 🎄 Check back later for more festive styles! ✨",
        false,
        style.name
      );
    }

    const cost = "cost" in style ? style.cost : TREE_STYLE_COST;
    const styleName = style.name;

    if (TreeStyleHelper.hasStyleUnlocked(ctx, styleName)) {
      return await this.buildPurchaseFailedMessage(
        ctx,
        "It looks like you've already unlocked all the available styles! 🎄 Check back later for more festive styles! ✨",
        false,
        styleName
      );
    }

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < cost) {
      return this.buildNotEnoughCoinsMessage(ctx, cost, styleName);
    }

    const embed = new EmbedBuilder()
      .setTitle("Confirm Your Purchase")
      .setDescription(
        `You are about to purchase the **${styleName}** style for **${cost}** coins. This style will give your tree a unique and festive look. Do you want to proceed?`
      )
      .setImage(await this.getTreeImageUrl(styleName));

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.confirm"),
      await ctx.manager.components.createInstance("shop.cosmetics.cancel")
    );

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  public async completeStylePurchase(ctx: ButtonContext): Promise<MessageBuilder> {
    const startTime = new Date();
    const userId = ctx.user.id;
    const guildId = ctx.interaction.guild_id ?? ctx.game?.id ?? "Unknown";
    let initialCoins = 0;

    try {
      if (!ctx.game || ctx.isDM) {
        return new MessageBuilder().addEmbed(
          new EmbedBuilder()
            .setTitle("Error")
            .setDescription("Please use /plant to plant a tree first.")
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
        );
      }

      const styleName = ctx.interaction.message.embeds[0].description?.match(/\*\*(.*?)\*\*/)?.[1];
      const cost = parseInt(ctx.interaction.message.embeds[0].description?.match(/\*\*(\d+)\*\*/)?.[1] ?? "0");

      if (!styleName || isNaN(cost)) {
        return await this.buildPurchaseFailedMessage(
          ctx,
          "It looks like there was an error with your purchase. Please try again later."
        );
      }

      const wallet = await WalletHelper.getWallet(ctx.user.id);
      initialCoins = wallet.coins;

      if (wallet.coins < cost) {
        return this.buildNotEnoughCoinsMessage(ctx, cost, styleName);
      }

      await WalletHelper.removeCoins(ctx.user.id, cost);

      await TreeStyleHelper.addNewStyle(ctx, styleName);

      // Log item name and other relevant details when a cosmetic purchase is made
      Metrics.recordCosmeticPurchaseMetric(
        styleName,
        ctx.user.id,
        ctx.interaction.guild_id ?? ctx.game?.id ?? "Unknown"
      );

      const embed = await this.getTreeStyleEmbed(styleName);

      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.cosmetics.refresh")
      );

      this.transitionBackToDefaultShopViewWithTimeout(ctx, 8 * 1000);

      const endTime = new Date();
      const finalCoins = wallet.coins;

      logger.info(
        {
          userId,
          timestamp: endTime.toISOString(),
          initialCoins,
          finalCoins,
          sku: styleName,
          displayName: styleName,
          success: true,
          specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
          guildId,
          duration: endTime.getTime() - startTime.getTime(),
          message: "Cosmetic purchase operation completed successfully."
        },
        `Cosmetic purchase operation completed successfully for user ${userId} with ${
          finalCoins - initialCoins
        } coins for ${styleName}.`
      );

      return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
    } catch (error) {
      const endTime = new Date();
      logger.error(
        {
          userId,
          timestamp: endTime.toISOString(),
          initialCoins,
          finalCoins: "N/A",
          sku: "N/A",
          displayName: "N/A",
          success: false,
          specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
          guildId,
          duration: endTime.getTime() - startTime.getTime(),
          error: (error as Error).message,
          message: "Cosmetic purchase operation failed."
        },
        `Cosmetic purchase operation failed for user ${userId} with ${initialCoins} coins.`
      );

      throw error;
    }
  }

  private async getTreeImageUrl(styleName: string | undefined): Promise<string> {
    let imageUrl = getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0];

    if (!styleName) {
      return imageUrl;
    }

    const hasImageResponse = await imageStyleApi.hasImageStyleImage(styleName);

    if (hasImageResponse.exists) {
      const imageResponse = await imageStyleApi.getImageStyleImage(styleName);
      if (imageResponse.success) {
        imageUrl = imageResponse.data?.url ?? imageUrl;
      }
    } else {
      imageStyleApi.getImageStyleImage(styleName);
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

  private async getItemShopStyles(): Promise<DailyItemShopStylesResult> {
    const response: DailyItemShopStylesResult = await styleItemShopApi.getDailyItemShopStyles();
    this.refreshTime = new Date(response.data.refreshTime);

    return response;
  }

  private async getAllStyles(componentManager: ComponentManager): Promise<(FestiveImageStyle | ItemShopStyleItem)[]> {
    const festiveStyles = await this.getFestiveTreeStyles();
    const itemShopStyles = await this.getItemShopStyles();
    const flatItemShop = Object.values(itemShopStyles.data.items).flat();
    const allStyle = [...festiveStyles, ...flatItemShop];

    if (!itemShopStyles.fromCache) {
      logger.info("Refreshing item shop styles...");
      await this.unregisterStyleButtons(componentManager, allStyle);
      await this.registerStyleButtons(componentManager, allStyle);
    }
    return allStyle;
  }

  private transitionBackToDefaultShopViewWithTimeout(ctx: ButtonContext, delay = 4000): void {
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(
      ctx.interaction.message.id,
      setTimeout(async () => {
        try {
          disposeActiveTimeouts(ctx);
          await safeEdit(ctx, await this.buildCosmeticsMessage(ctx));
        } catch (e) {
          logger.info(e);
        }
      }, delay)
    );
  }

  private async buildPurchaseFailedMessage(
    ctx: ButtonContext,
    description: string,
    showPremiumButton = false,
    styleName?: string
  ): Promise<MessageBuilder> {
    const festiveMessage = SpecialDayHelper.getFestiveMessage();

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );
    if (showPremiumButton && !process.env.DEV_MODE) {
      actionRow.addComponents(PremiumButtons.FestiveForestButton);
    }
    this.transitionBackToDefaultShopViewWithTimeout(ctx);
    const embed = new EmbedBuilder()
      .setTitle("🎅 Purchase Failed! ❄️")
      .setDescription(description)
      .setImage(await this.getTreeImageUrl(styleName));

    if (festiveMessage.isPresent) {
      embed.setFooter({ text: festiveMessage.message });
    }
    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private async buildNotEnoughCoinsMessage(
    ctx: ButtonContext,
    cost: number,
    styleName: string
  ): Promise<MessageBuilder> {
    const festiveMessage = SpecialDayHelper.getFestiveMessage();
    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.cosmetics.refresh")
    );

    if (!process.env.DEV_MODE) {
      actionRow.addComponents(PremiumButtons.LuckyCoinBagButton);
    }
    this.transitionBackToDefaultShopViewWithTimeout(ctx);
    const embed = new EmbedBuilder()
      .setTitle("🎅 Not Enough Coins! ❄️")
      .setDescription(
        `You need **${cost}** coins to purchase the **${styleName}** tree style. Keep earning and come back soon! 🎄`
      )
      .setImage(getRandomElement(COSMETIC_IMAGES) ?? COSMETIC_IMAGES[0]);

    if (festiveMessage.isPresent) {
      embed.setFooter({ text: festiveMessage.message });
    }
    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }
}
