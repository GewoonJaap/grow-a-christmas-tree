import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  MessageBuilder,
  SlashCommandContext
} from "interactions.ts";
import { BoosterHelper, BoosterName } from "../../../util/booster/BoosterHelper";
import { getRandomElement } from "../../../util/helpers/arrayHelper";
import { WalletHelper } from "../../../util/wallet/WalletHelper";
import { disposeActiveTimeouts } from "../../Tree";
import { SpecialDayHelper } from "../../../util/special-days/SpecialDayHelper";
import humanizeDuration = require("humanize-duration");
import { PartialCommand } from "../../../util/types/command/PartialCommandType";
import { safeReply, safeEdit } from "../../../util/discord/MessageExtenstions";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

type BoostersButtonState = {
  page: number;
};

export class Boosters implements PartialCommand {
  public entryButtonName = "shop.boosters";

  public components: Button[] = [
    new Button(
      this.entryButtonName,
      new ButtonBuilder().setEmoji({ name: "✨" }).setStyle(1).setLabel("Boosters"),
      async (ctx: ButtonContext): Promise<void> => {
        return safeReply(ctx, await this.buildBoostersMessage(ctx));
      }
    ),
    new Button(
      "shop.boosters.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return safeReply(ctx, await this.buildBoostersMessage(ctx));
      }
    ),
    new Button(
      "boosters.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2).setLabel("Next"),
      async (ctx: ButtonContext<BoostersButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return safeReply(ctx, await this.buildBoostersMessage(ctx));
      }
    ),
    new Button(
      "boosters.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2).setLabel("Back"),
      async (ctx: ButtonContext<BoostersButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return safeReply(ctx, await this.buildBoostersMessage(ctx));
      }
    ),
    ...Object.values(BoosterHelper.BOOSTERS).map(
      (booster) =>
        new Button(
          `shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`,
          new ButtonBuilder().setEmoji({ name: booster.emoji }).setStyle(1).setLabel(booster.name),
          async (ctx: ButtonContext): Promise<void> => {
            return safeReply(ctx, await this.handleBoosterPurchase(ctx, booster));
          }
        )
    )
  ];

  /**
   * Check if the state is valid
   * @param state BoostersButtonState
   * @returns boolean indicating if the state is valid
   */
  private isStateValid(state: BoostersButtonState | undefined): boolean {
    if (!state) return false;
    if (isNaN(state.page)) return false;
    if (state.page < 0) return false;
    return true;
  }

  public async buildBoostersMessage(
    ctx: SlashCommandContext | ButtonContext<BoostersButtonState>
  ): Promise<MessageBuilder> {
    const state: BoostersButtonState =
      ctx instanceof SlashCommandContext || !this.isStateValid(ctx.state)
        ? { page: 1 }
        : (ctx.state as BoostersButtonState);

    const specialDayMultipliers = SpecialDayHelper.getSpecialDayMultipliers();
    const discountModifier = specialDayMultipliers.isActive
      ? specialDayMultipliers.inGameShop.boosters.priceMultiplier
      : 1;
    const discountText = specialDayMultipliers ? `\n\n${specialDayMultipliers.inGameShop.boosters.reason}` : "";

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Boosters Shop** 🎁")
      .setDescription(
        "✨ Discover limited-time boosters to speed up tree growth, watering, minigame chances, and coin earnings. Make your tree the star of the season! 🌟" +
          discountText
      )
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      .setFooter({ text: `Page ${state.page}/${Math.ceil(Object.values(BoosterHelper.BOOSTERS).length / 2)}` });

    const boostersPerPage = 2;
    const start = (state.page - 1) * boostersPerPage;
    const paginatedBoosters = Object.values(BoosterHelper.BOOSTERS).slice(start, start + boostersPerPage);

    const fields = paginatedBoosters.map((booster) => ({
      name: `${booster.name} ${booster.emoji}`,
      value: `**Effect:** ${booster.effect}\n**Cost:** ${Math.floor(
        booster.cost * discountModifier
      )} coins\n**Duration:** ${humanizeDuration(booster.duration * 1000, { largest: 1 })}`,
      inline: false
    }));

    embed.addFields(fields);

    const actionRow = new ActionRowBuilder().addComponents(
      ...(await Promise.all(
        paginatedBoosters.map((booster) =>
          ctx.manager.components.createInstance(`shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`)
        )
      )),
      await ctx.manager.components.createInstance("shop.main")
    );

    if (state.page > 1) {
      actionRow.addComponents(await ctx.manager.components.createInstance("boosters.back", state));
    }

    if (Object.values(BoosterHelper.BOOSTERS).length > start + boostersPerPage) {
      actionRow.addComponents(await ctx.manager.components.createInstance("boosters.next", state));
    }

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  public async handleBoosterPurchase(
    ctx: ButtonContext,
    booster: { name: BoosterName; cost: number; duration: number }
  ): Promise<MessageBuilder> {
    if (!ctx.game || ctx.isDM) {
      return new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("Please use /plant to plant a tree first.")
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      );
    }

    const specialDayMultipliers = SpecialDayHelper.getSpecialDayMultipliers();
    const discountModifier = specialDayMultipliers.isActive
      ? specialDayMultipliers.inGameShop.boosters.priceMultiplier
      : 1;
    const discountedCost = Math.floor(booster.cost * discountModifier);

    const wallet = await WalletHelper.getWallet(ctx.user.id);

    if (wallet.coins < discountedCost) {
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.boosters.refresh")
      );
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Not Enough Coins! ❄️")
            .setDescription(
              `You need **${discountedCost}** coins to purchase: **${booster.name}**. Keep earning and come back soon! 🎄`
            )
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
        )
        .addComponents(actionRow);
    }

    const result = await BoosterHelper.purchaseBooster(ctx, booster.name);
    if (!result) {
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("shop.boosters.refresh")
      );
      this.transitionBackToDefaultShopViewWithTimeout(ctx);
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle("🎅 Purchase Failed! ❄️")
            .setDescription(`Sorry, something went wrong. Please try again later. 🎄`)
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
        )
        .addComponents(actionRow);
    }
    await ctx.game.save();

    this.transitionBackToDefaultShopViewWithTimeout(ctx);

    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("shop.boosters.refresh")
    );

    return new MessageBuilder()
      .addEmbed(
        new EmbedBuilder()
          .setTitle("🎁 Purchase Complete!")
          .setDescription(`You've successfully acquired **${booster.name}**! Let the magic begin! 🎄✨`)
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
      )
      .addComponents(actionRow);
  }

  private transitionBackToDefaultShopViewWithTimeout(ctx: ButtonContext, delay = 4000): void {
    disposeActiveTimeouts(ctx);
    ctx.timeouts.set(
      ctx.interaction.message.id,
      setTimeout(async () => {
        try {
          disposeActiveTimeouts(ctx);

          await safeEdit(ctx, await this.buildBoostersMessage(ctx));
        } catch (e) {
          console.log(e);
        }
      }, delay)
    );
  }
}
