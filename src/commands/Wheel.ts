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
import { WheelState } from "../models/WheelState";
import { WalletHelper } from "../util/wallet/WalletHelper";
import { getRandomElement } from "../util/helpers/arrayHelper";
import { PremiumButtonBuilder } from "../util/discord/DiscordApiExtensions";

const REWARD_PROBABILITIES = {
  tickets: 0.3,
  coins: 0.5,
  composterUpgrade: 0.15,
  other: 0.05
};

export class Wheel implements ISlashCommand {
  public builder = new SlashCommandBuilder("wheel", "Spin the wheel of fortune for rewards.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const userId = ctx.user.id;
    const wheelState = await WheelState.findOne({ userId });

    if (!wheelState) {
      await WheelState.create({ userId, tickets: 1, lastSpinDate: new Date(0), theme: "default" });
    }

    return await ctx.reply(await buildWheelMessage(ctx));
  };

  public components = [
    new Button(
      "wheel.spin",
      new ButtonBuilder().setEmoji({ name: "🎡" }).setStyle(1).setLabel("Spin the Wheel"),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await handleSpin(ctx));
      }
    ),
    new Button(
      "wheel.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await buildWheelMessage(ctx));
      }
    )
  ];
}

async function buildWheelMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wheelState = await WheelState.findOne({ userId });

  if (!wheelState) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Wheel of Fortune")
        .setDescription("You need to have at least one ticket to spin the wheel.")
        .setColor(0xff0000)
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("Wheel of Fortune")
    .setDescription(
      `🎡 **Spin the Wheel of Fortune!** 🎡\n\nYou have ${wheelState.tickets} ticket(s) available.\n\nSpin the wheel to win exciting rewards like tickets, coins, and composter upgrades!`
    )
    .setImage("https://example.com/wheel-image.jpg");

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("wheel.spin"),
    await ctx.manager.components.createInstance("wheel.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleSpin(ctx: ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wheelState = await WheelState.findOne({ userId });

  if (!wheelState || wheelState.tickets <= 0) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Wheel of Fortune")
        .setDescription("You need to have at least one ticket to spin the wheel.")
        .setColor(0xff0000)
    );
  }

  wheelState.tickets--;
  wheelState.lastSpinDate = new Date();

  const reward = determineReward();
  await applyReward(ctx, reward);

  await wheelState.save();

  const embed = new EmbedBuilder()
    .setTitle("Wheel of Fortune")
    .setDescription(`You spun the wheel and won ${reward}!`)
    .setColor(0x00ff00);

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("wheel.spin"),
    await ctx.manager.components.createInstance("wheel.refresh")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

function determineReward(): string {
  const random = Math.random();
  let cumulativeProbability = 0;

  for (const [reward, probability] of Object.entries(REWARD_PROBABILITIES)) {
    cumulativeProbability += probability;
    if (random < cumulativeProbability) {
      return reward;
    }
  }

  return "other";
}

async function applyReward(ctx: ButtonContext, reward: string): Promise<void> {
  const userId = ctx.user.id;

  switch (reward) {
    case "tickets":
      const wheelState = await WheelState.findOne({ userId });
      if (wheelState) {
        wheelState.tickets += 1;
        await wheelState.save();
      }
      break;
    case "coins":
      await WalletHelper.addCoins(userId, 100);
      break;
    case "composterUpgrade":
      const guild = ctx.game;
      if (guild) {
        guild.composter.efficiencyLevel += 1;
        await guild.save();
      }
      break;
    default:
      break;
  }
}
