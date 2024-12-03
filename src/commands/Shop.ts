import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { BoosterHelper, BoosterName } from "../util/booster/BoosterHelper";
import humanizeDuration = require("humanize-duration");
import { getRandomElement } from "../util/helpers/arrayHelper";
import { disposeActiveTimeouts } from "./Tree";
import { getRandomTreeStyle } from "../util/helpers/treeStyleHelper";
import { Guild } from "../models/Guild";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-2.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-3.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/shop/shop-4.jpg"
];

export class Shop implements ISlashCommand {
  public builder = new SlashCommandBuilder(
    "shop",
    "Browse and grab magical items from the shop to power up your tree! 🎁"
  );

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildShopMessage(ctx));
  };

  public components = [
    ...Object.values(BoosterHelper.BOOSTERS).map(
      (booster) =>
        new Button(
          `shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`,
          new ButtonBuilder().setEmoji({ name: booster.emoji }).setStyle(1).setLabel(booster.name),
          async (ctx: ButtonContext): Promise<void> => {
            return ctx.reply(await handleBoosterPurchase(ctx, booster));
          }
        )
    ),
    new Button(
      "shop.buy.tree_style",
      new ButtonBuilder().setEmoji({ name: "🎄" }).setStyle(1).setLabel("Tree Style"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await handleTreeStylePurchase(ctx));
      }
    ),
    new Button(
      "shop.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildShopMessage(ctx));
      }
    )
  ];
}

async function buildShopMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("🎄 **The Christmas Shop** 🎁")
    .setDescription(
      "🎄 Welcome to the Christmas Shop! Discover limited-time boosters to speed up tree growth, watering, minigame chances, and coin earnings. Make your tree the star of the season! 🌟\n\nUse **`/serverinfo`** to view your active boosters."
    )
    .setImage(getRandomElement(IMAGES) ?? IMAGES[0]);

  const fields = Object.values(BoosterHelper.BOOSTERS).map((booster) => ({
    name: `${booster.name} ${booster.emoji}`,
    value: `**Effect:** ${booster.effect}\n**Cost:** ${booster.cost} coins\n**Duration:** ${humanizeDuration(
      booster.duration * 1000,
      { largest: 1 }
    )}`,
    inline: false
  }));

  fields.push({
    name: "Tree Style 🎄",
    value: `**Effect:** Unlocks a random tree style\n**Cost:** 100 coins`,
    inline: false
  });

  embed.addFields(fields);

  const actionRow = new ActionRowBuilder().addComponents(
    ...(await Promise.all(
      Object.values(BoosterHelper.BOOSTERS).map((booster) =>
        ctx.manager.components.createInstance(`shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`)
      )
    )),
    await ctx.manager.components.createInstance("shop.buy.tree_style"),
    await ctx.manager.components.createInstance("shop.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleBoosterPurchase(
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
  const wallet = await WalletHelper.getWallet(ctx.user.id);

  if (wallet.coins < booster.cost) {
    transitionBackToDefaultShopViewWithTimeout(ctx);
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎅 Not Enough Coins! ❄️")
        .setDescription(
          `You need **${booster.cost}** coins to purchase: **${booster.name}**. Keep earning and come back soon! 🎄`
        )
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }

  const result = await BoosterHelper.purchaseBooster(ctx, booster.name);
  if (!result) {
    transitionBackToDefaultShopViewWithTimeout(ctx);
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎅 Purchase Failed! ❄️")
        .setDescription(`Sorry, something went wrong. Please try again later. 🎄`)
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }
  await ctx.game.save();

  transitionBackToDefaultShopViewWithTimeout(ctx);

  return new MessageBuilder().addEmbed(
    new EmbedBuilder()
      .setTitle("🎁 Purchase Complete!")
      .setDescription(`You've successfully acquired **${booster.name}**! Let the magic begin! 🎄✨`)
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
  );
}

async function handleTreeStylePurchase(ctx: ButtonContext): Promise<MessageBuilder> {
  if (!ctx.game || ctx.isDM) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Error")
        .setDescription("Please use /plant to plant a tree first.")
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }
  const wallet = await WalletHelper.getWallet(ctx.user.id);

  const treeStyleCost = 100;
  if (wallet.coins < treeStyleCost) {
    transitionBackToDefaultShopViewWithTimeout(ctx);
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎅 Not Enough Coins! ❄️")
        .setDescription(
          `You need **${treeStyleCost}** coins to purchase a tree style. Keep earning and come back soon! 🎄`
        )
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }

  const randomTreeStyle = getRandomTreeStyle(ctx.game.unlockedTreeStyles);
  if (!randomTreeStyle) {
    transitionBackToDefaultShopViewWithTimeout(ctx);
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎅 Purchase Failed! ❄️")
        .setDescription(`Sorry, something went wrong. Please try again later. 🎄`)
        .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
    );
  }

  ctx.game.unlockedTreeStyles.push(randomTreeStyle);
  await ctx.game.save();

  transitionBackToDefaultShopViewWithTimeout(ctx);

  return new MessageBuilder().addEmbed(
    new EmbedBuilder()
      .setTitle("🎁 Purchase Complete!")
      .setDescription(`You've successfully unlocked the **${randomTreeStyle}** tree style! 🎄✨`)
      .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
  );
}

function transitionBackToDefaultShopViewWithTimeout(ctx: ButtonContext, delay = 4000): void {
  disposeActiveTimeouts(ctx);
  ctx.timeouts.set(
    ctx.interaction.message.id,
    setTimeout(async () => {
      try {
        disposeActiveTimeouts(ctx);

        await ctx.edit(await buildShopMessage(ctx));
      } catch (e) {
        console.log(e);
      }
    }, delay)
  );
}
