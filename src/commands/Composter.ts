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
import { getRandomElement } from "../util/helpers/arrayHelper";
import { FESTIVE_ENTITLEMENT_SKU_ID, PremiumButtonBuilder } from "../util/discord/DiscordApiExtensions";
import { MessageUpsellType } from "../util/types/MessageUpsellType";

const BASE_COST = 100;
const COST_INCREMENT = 50;
const MAX_LEVEL = 100;
const MAX_BOOST = 100; // 100% boost at max level
const MAX_GROWTH_AMOUNT = 5; // 5ft growth at max level

const composterImages = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/composter/composter-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/composter/composter-2.jpg"
];

export class Composter implements ISlashCommand {
  public builder = new SlashCommandBuilder("composter", "View and upgrade Santa's Magic Composter.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildComposterMessage(ctx));
  };

  public components = [
    new Button(
      "composter.upgrade.efficiency",
      new ButtonBuilder().setEmoji({ name: "🧝" }).setStyle(1).setLabel("Elf-Powered Efficiency"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await handleUpgrade(ctx, "efficiency"));
      }
    ),
    new Button(
      "composter.upgrade.quality",
      new ButtonBuilder().setEmoji({ name: "✨" }).setStyle(1).setLabel("Sparkling Spirit"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await handleUpgrade(ctx, "quality"));
      }
    ),
    new Button(
      "composter.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await buildComposterMessage(ctx));
      }
    )
  ];
}

function upsellText(hasPremium: boolean): MessageUpsellType {
  const random = Math.random();
  if (hasPremium) {
    return {
      message:
        "✨ With the Festive Forest subscription, Santa's Magic Composter gives you an extra 10% boost to growth chance and growth amount. Enjoy the magic of the season!",
      isUpsell: false
    };
  }
  if (random > 0.5 && !hasPremium) {
    return {
      message:
        "🎄 Did you know? With the Festive Forest subscription, Santa's Magic Composter works even more magically! Unlock the full potential of your tree!",
      isUpsell: true,
      buttonSku: FESTIVE_ENTITLEMENT_SKU_ID
    };
  }
  return {
    message: "🎅 Let Santa's elves and festive magic boost your tree's growth. Experience the magic today!",
    isUpsell: false
  };
}

async function buildComposterMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  if (!ctx.game) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Santa's Magic Composter")
        .setDescription("You need to plant a tree first before you can upgrade the composter.")
        .setColor(0xff0000)
        .setImage(getRandomElement(composterImages) ?? "")
    );
  }

  if (ctx.isDM) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Santa's Magic Composter")
        .setDescription("You can only upgrade the composter in a server.")
        .setColor(0xff0000)
        .setImage(getRandomElement(composterImages) ?? "")
    );
  }

  const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
  const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

  const efficiencyUpgradeCost = BASE_COST + efficiencyLevel * COST_INCREMENT;
  const qualityUpgradeCost = BASE_COST + qualityLevel * COST_INCREMENT;
  const growthChance = calculateGrowthChance(efficiencyLevel, ctx.game?.hasAiAccess ?? false);
  const growthAmount = calculateGrowthAmount(qualityLevel, ctx.game?.hasAiAccess ?? false);
  const upsellData = upsellText(ctx.game.hasAiAccess ?? false);

  const embed = new EmbedBuilder()
    .setTitle("Santa's Magic Composter")
    .setDescription(
      `Upgrade the composter to make your tree grow faster!\n\n🧝 **Elf-Powered Efficiency:** Increases the chance that Santa’s workshop elves give your tree an extra magical boost!\n✨ **Sparkling Spirit:** Enhances the growth boost your tree receives each time you water it!\n\n🧝 **Current Efficiency Level:** ${efficiencyLevel}\n🪙 **Efficiency Upgrade Cost:** ${efficiencyUpgradeCost} coins\n\n✨ **Current Quality Level:** ${qualityLevel}\n🪙 **Quality Upgrade Cost:** ${qualityUpgradeCost} coins\n\n**Extra Growth Chance:** ${growthChance}%\n**Growth Amount:** ${growthAmount}ft`
    )
    .setImage(getRandomElement(composterImages) ?? "")
    .setFooter({ text: upsellData.message });

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("composter.upgrade.efficiency"),
    await ctx.manager.components.createInstance("composter.upgrade.quality"),
    await ctx.manager.components.createInstance("composter.refresh")
  );

  if (upsellData.isUpsell && upsellData.buttonSku && !process.env.DEV_MODE) {
    actionRow.addComponents(new PremiumButtonBuilder().setSkuId(upsellData.buttonSku));
  }

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleUpgrade(ctx: ButtonContext, upgradeType: "efficiency" | "quality"): Promise<MessageBuilder> {
  if (!ctx.game) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Santa's Magic Composter")
        .setDescription("You need to plant a tree first before you can upgrade the composter.")
        .setColor(0xff0000)
        .setImage(getRandomElement(composterImages) ?? "")
    );
  }

  if (ctx.isDM) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Santa's Magic Composter")
        .setColor(0xff0000)
        .setImage(getRandomElement(composterImages) ?? "")
        .setDescription("You can only upgrade the composter in a server.")
    );
  }

  const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
  const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

  const upgradeCost =
    upgradeType === "efficiency"
      ? BASE_COST + efficiencyLevel * COST_INCREMENT
      : BASE_COST + qualityLevel * COST_INCREMENT;

  const wallet = await WalletHelper.getWallet(ctx.user.id);

  if (wallet.coins < upgradeCost && !process.env.DEV_MODE) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Upgrade Failed")
        .setDescription(`You need ${upgradeCost} coins to upgrade the composter.`)
        .setImage(getRandomElement(composterImages) ?? "")
        .setColor(0xff0000)
    );
  }

  await WalletHelper.removeCoins(ctx.user.id, upgradeCost);

  if (upgradeType === "efficiency") {
    ctx.game.composter.efficiencyLevel++;
  } else {
    ctx.game.composter.qualityLevel++;
  }

  await ctx.game.save();

  return buildComposterMessage(ctx);
}

export function calculateGrowthChance(level: number, hasAiAccess: boolean): number {
  const baseChance = hasAiAccess ? 1.1 : 1; // Premium users get a 10% boost
  return Math.min(MAX_BOOST, (level / MAX_LEVEL) * MAX_BOOST * baseChance);
}

export function calculateGrowthAmount(level: number, hasAiAccess: boolean): number {
  const baseAmount = hasAiAccess ? 1.1 : 1; // Premium users get a 10% boost
  return parseFloat(Math.min(MAX_GROWTH_AMOUNT, (level / MAX_LEVEL) * MAX_GROWTH_AMOUNT * baseAmount).toFixed(1));
}
