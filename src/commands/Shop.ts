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
import { IGuild } from "../models/Guild";

const BOOSTERS = [
  {
    name: "Turbo Grow",
    effect: "Doubles the tree growth speed for 1 hour",
    cost: 100,
    emoji: "🌱",
    duration: 3600
  },
  {
    name: "Quick Water",
    effect: "Reduces the watering interval by half for 1 hour",
    cost: 80,
    emoji: "💧",
    duration: 3600
  },
  {
    name: "Minigame Mania",
    effect: "Increases the chance of triggering minigames by 50% for 1 hour",
    cost: 120,
    emoji: "🎮",
    duration: 3600
  },
  {
    name: "Coin Doubler",
    effect: "Doubles the coins earned from minigames and daily rewards for 1 hour",
    cost: 150,
    emoji: "🪙",
    duration: 3600
  }
];

export class Shop implements ISlashCommand {
  public builder = new SlashCommandBuilder("shop", "Open the booster shop.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildShopMessage(ctx));
  };

  public components = BOOSTERS.map((booster) =>
    new Button(
      `shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`,
      new ButtonBuilder().setEmoji({ name: booster.emoji }).setStyle(1).setLabel(booster.name),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await handleBoosterPurchase(ctx, booster));
      }
    )
  );
}

async function buildShopMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("Booster Shop")
    .setDescription(
      "Welcome to the Booster Shop! Here you can purchase limited-time boosters to enhance your tree growth, watering, minigame chances, and coin earnings. Each booster lasts for 1 hour."
    );

  BOOSTERS.forEach((booster) => {
    embed.addField(
      `${booster.name} ${booster.emoji}`,
      `**Effect:** ${booster.effect}\n**Cost:** ${booster.cost} coins`
    );
  });

  const actionRow = new ActionRowBuilder().addComponents(
    ...BOOSTERS.map((booster) => ctx.manager.components.createInstance(`shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`))
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleBoosterPurchase(ctx: ButtonContext, booster: { name: string; cost: number; duration: number }): Promise<MessageBuilder> {
  const wallet = await WalletHelper.getWallet(ctx.user.id);

  if (wallet.coins < booster.cost) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Insufficient Coins")
        .setDescription(
          `You do not have enough coins to purchase the ${booster.name} booster. You need ${booster.cost} coins.`
        )
    );
  }

  await WalletHelper.removeCoins(ctx.user.id, booster.cost);

  const guild = ctx.game as IGuild;
  const existingBooster = guild.activeBoosters.find((b) => b.type === booster.name);

  if (existingBooster) {
    if (isBoosterExpired(existingBooster)) {
      existingBooster.startTime = Math.floor(Date.now() / 1000);
      existingBooster.duration = booster.duration;
    } else {
      existingBooster.duration += booster.duration;
    }
  } else {
    guild.activeBoosters.push({
      type: booster.name,
      startTime: Math.floor(Date.now() / 1000),
      duration: booster.duration
    });
  }

  await guild.save();

  return new MessageBuilder().addEmbed(
    new EmbedBuilder()
      .setTitle("Booster Purchased")
      .setDescription(`You have successfully purchased the ${booster.name} booster!`)
  );
}

function isBoosterExpired(booster: { startTime: number; duration: number }): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime > booster.startTime + booster.duration;
}
