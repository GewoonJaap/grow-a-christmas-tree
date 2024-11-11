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

const BOOSTERS = [
  {
    name: "Growth Booster",
    emoji: "🌱",
    effect: "Increases tree growth rate by 50%",
    cost: 100,
    duration: 3600
  },
  {
    name: "Watering Booster",
    emoji: "💧",
    effect: "Reduces watering cooldown by 50%",
    cost: 100,
    duration: 3600
  },
  {
    name: "Minigame Booster",
    emoji: "🎮",
    effect: "Increases minigame chances by 50%",
    cost: 100,
    duration: 3600
  },
  {
    name: "Coin Booster",
    emoji: "🪙",
    effect: "Increases coin earnings by 50%",
    cost: 100,
    duration: 3600
  }
];

export class Shop implements ISlashCommand {
  public builder = new SlashCommandBuilder("shop", "View and purchase boosters from the shop.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildShopMessage(ctx));
  };

  public components = BOOSTERS.map(
    (booster) =>
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

  const fields = BOOSTERS.map((booster) => ({
    name: `${booster.name} ${booster.emoji}`,
    value: `**Effect:** ${booster.effect}\n**Cost:** ${booster.cost} coins`,
    inline: false
  }));

  embed.addFields(fields);

  const actionRow = new ActionRowBuilder().addComponents(
    ...(await Promise.all(
      BOOSTERS.map((booster) =>
        ctx.manager.components.createInstance(`shop.buy.${booster.name.toLowerCase().replace(/ /g, "_")}`)
      )
    ))
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleBoosterPurchase(
  ctx: ButtonContext,
  booster: { name: string; cost: number; duration: number }
): Promise<MessageBuilder> {
  if (!ctx.game) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Error")
        .setDescription("Please use /plant to plant a tree first.")
    );
  }
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

  // Deduct coins and apply booster logic here

  return new MessageBuilder().addEmbed(
    new EmbedBuilder()
      .setTitle("Booster Purchased")
      .setDescription(`You have successfully purchased the ${booster.name} booster!`)
  );
}