import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  ComponentManager,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { BanHelper } from "../../util/bans/BanHelper";
import { getRandomElement } from "../../util/helpers/arrayHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../../util/unleash/UnleashHelper";
import { Boosters } from "./categories/Boosters";
import { Cosmetics } from "./categories/Cosmetics";
import { DynamicButtonsCommandType } from "../../util/types/command/DynamicButtonsCommandType";
import { safeReply } from "../../util/discord/MessageExtenstions";
import { SpecialDayHelper } from "../../util/special-days/SpecialDayHelper";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

export class Shop implements ISlashCommand, DynamicButtonsCommandType {
  private categories = [new Boosters(), new Cosmetics()];

  public builder = new SlashCommandBuilder(
    "shop",
    "Browse and grab magical items from the shop to power up your tree! 🎁"
  );

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return safeReply(ctx, await buildShopMessage(ctx));
  };

  public components = [
    ...this.categories.flatMap((category) => category.components),
    new Button(
      "shop.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        if (
          UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) &&
          (await BanHelper.isUserBanned(ctx.user.id))
        ) {
          return await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
        }
        return await safeReply(ctx, await buildShopMessage(ctx));
      }
    ),
    new Button(
      "shop.main",
      new ButtonBuilder().setEmoji({ name: "🏠" }).setStyle(2).setLabel("Shop menu"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await buildShopMessage(ctx));
      }
    )
  ];

  public async registerDynamicButtons(componentManager: ComponentManager): Promise<void> {
    for (const category of this.categories) {
      if ("registerDynamicButtons" in category) {
        await (category as DynamicButtonsCommandType).registerDynamicButtons(componentManager);
      }
    }
  }
}

async function buildShopMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const festiveMessages = SpecialDayHelper.getFestiveMessage();
  const embed = new EmbedBuilder()
    .setTitle("🎄 **The Christmas Shop** 🎁")
    .setDescription(
      "🎄 Welcome to the Christmas Shop! Discover limited-time boosters and cosmetics to power up your tree and make it the star of the season! 🌟\n\nUse **`/serverinfo`** to view your active boosters."
    )
    .setImage(getRandomElement(IMAGES) ?? IMAGES[0]);

  if (festiveMessages.isPresent) {
    embed.setFooter({ text: festiveMessages.message });
  }

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("shop.boosters"),
    await ctx.manager.components.createInstance("shop.cosmetics"),
    await ctx.manager.components.createInstance("shop.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}
