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
import { WheelStateHelper } from "../util/wheel/WheelStateHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { Metrics } from "../tracing/metrics"; // Import Metrics
import pino from "pino";
import { AchievementHelper } from "../util/achievement/AchievementHelper";

const logger = pino({
  level: "info"
});

type RewardType = "tickets" | "coins" | "composterEfficiencyUpgrade" | "composterQualityUpgrade" | "treeSize";

interface Reward {
  displayName: string;
  probability: number;
}

const REWARDS: Record<RewardType, Reward> = {
  tickets: { displayName: "Tickets", probability: 0.05 },
  coins: { displayName: "Coins", probability: 0.8 },
  composterEfficiencyUpgrade: { displayName: "Composter Efficiency Upgrade", probability: 0.05 },
  composterQualityUpgrade: { displayName: "Composter Quality Upgrade", probability: 0.05 },
  treeSize: { displayName: "Tree Size Increase", probability: 0.05 }
};

export class Wheel implements ISlashCommand {
  public builder = new SlashCommandBuilder("wheel", "Give it a whirl and unwrap festive rewards! 🎅✨");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return await safeReply(ctx, await buildWheelMessage(ctx));
  };

  public components = [
    new Button(
      "wheel.spin",
      new ButtonBuilder().setEmoji({ name: "🎡" }).setStyle(1).setLabel("Spin the Wheel"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await handleSpin(ctx));
      }
    ),
    new Button(
      "wheel.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await buildWheelMessage(ctx));
      }
    ),
    new Button(
      "wheel.chances",
      new ButtonBuilder().setEmoji({ name: "📊" }).setStyle(2).setLabel("Win Chances"),
      async (ctx: ButtonContext): Promise<void> => {
        return await safeReply(ctx, await showWinChances(ctx));
      }
    )
  ];
}

async function buildWheelMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wheelState = await WheelStateHelper.getWheelState(userId);
  const festiveMessages = SpecialDayHelper.getFestiveMessage();

  const embed = new EmbedBuilder()
    .setTitle("🎅 Santa's Lucky Spin! 🎁")
    .setDescription(
      `🎁 **Spin Santa's Wheel of Fortune!** 🎄\nUse your ${wheelState.tickets} ticket${
        wheelState.tickets === 1 ? "" : "s"
      } to win coins, tickets, and festive composter upgrades! 🎅✨`
    )
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

  if (festiveMessages.isPresent) {
    embed.setFooter({ text: festiveMessages.message });
  }

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("wheel.spin"),
    await ctx.manager.components.createInstance("wheel.refresh"),
    await ctx.manager.components.createInstance("wheel.chances")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleSpin(ctx: ButtonContext): Promise<MessageBuilder> {
  if (!ctx.game || ctx.isDM) {
    return new MessageBuilder().setContent("This command can only be used in a server with a tree.");
  }

  const festiveMessages = SpecialDayHelper.getFestiveMessage();

  const userId = ctx.user.id;
  const wheelState = await WheelStateHelper.getWheelState(userId);

  const ticketsBeforeSpin = wheelState.tickets;

  if (wheelState.tickets <= 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎅 Santa's Lucky Spin! 🎁")
      .setDescription("🎟️ **You need at least one ticket to give the wheel a spin!** 🎄")
      .setColor(0xff0000)
      .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

    if (festiveMessages.isPresent) {
      embed.setFooter({ text: festiveMessages.message });
    }

    const actions = new ActionRowBuilder().addComponents(await ctx.manager.components.createInstance("wheel.refresh"));

    const message = new MessageBuilder().addEmbed(embed).addComponents(actions);

    logger.info(
      {
        userId,
        timestamp: new Date().toISOString(),
        ticketsBeforeSpin,
        ticketsAfterSpin: wheelState.tickets,
        premiumAccess: ctx.game.hasAiAccess ?? false,
        specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
        success: false,
        message: "User attempted to spin the wheel without enough tickets."
      },
      `User ${userId} attempted to spin the wheel without enough tickets.`
    );

    return message;
  }

  const hasSpinnedWheel = await WheelStateHelper.spinWheel(userId);

  if (!hasSpinnedWheel) {
    const embed = new EmbedBuilder()
      .setTitle("🎅 Santa's Lucky Spin! 🎁")
      .setDescription("🎟️ **You need at least one ticket to give the wheel a spin!** 🎄")
      .setColor(0xff0000)
      .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

    if (festiveMessages.isPresent) {
      embed.setFooter({ text: festiveMessages.message });
    }

    logger.info(
      {
        userId,
        timestamp: new Date().toISOString(),
        ticketsBeforeSpin,
        ticketsAfterSpin: wheelState.tickets,
        premiumAccess: ctx.game.hasAiAccess ?? false,
        specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
        success: false,
        message: "User attempted to spin the wheel but the operation failed."
      },
      `User ${userId} attempted to spin the wheel but the operation failed.`
    );

    return new MessageBuilder().addEmbed(embed);
  }

  const reward = determineReward(ctx.game.hasAiAccess ?? false);
  await applyReward(ctx, reward);

  await wheelState.save();

  const rewardDescription =
    reward.amount != undefined
      ? `${reward.amount} ${REWARDS[reward.type].displayName}`
      : REWARDS[reward.type].displayName;
  const embed = new EmbedBuilder()
    .setTitle("🎅 Santa's Lucky Spin! 🎁")
    .setDescription(`🎉 **<@${ctx.user.id}>, You spun the wheel and won ${rewardDescription}!** 🎁`)
    .setColor(0x00ff00)
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

  await AchievementHelper.grantAchievement(userId, "Wheel of Fortune Winner");

  if (festiveMessages.isPresent) {
    embed.setFooter({ text: festiveMessages.message });
  }

  // Log number of spins, rewards won, tickets used, user participation, and spin success rate
  Metrics.recordWheelSpinMetric(userId, ctx.interaction.guild_id ?? "unknown", reward.type, reward.amount ?? 1);

  logger.info(
    {
      userId,
      timestamp: new Date().toISOString(),
      ticketsBeforeSpin,
      ticketsAfterSpin: wheelState.tickets,
      rewardType: reward.type,
      rewardAmount: reward.amount ?? 1,
      premiumAccess: ctx.game.hasAiAccess ?? false,
      specialDayMultipliers: SpecialDayHelper.getSpecialDayMultipliers(),
      success: true,
      message: "User successfully spun the wheel and won a reward."
    },
    `User ${userId} successfully spun the wheel and won ${rewardDescription}.`
  );

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("wheel.spin"),
    await ctx.manager.components.createInstance("wheel.refresh"),
    await ctx.manager.components.createInstance("wheel.chances")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function showWinChances(ctx: ButtonContext): Promise<MessageBuilder> {
  const festiveMessages = SpecialDayHelper.getFestiveMessage();
  const chancesDescription = Object.entries(REWARDS)
    .map(([key, { displayName, probability }]) => `**${displayName}:** ${(probability * 100).toFixed(2)}%`)
    .join("\n");

  const embed = new EmbedBuilder().setTitle("🎰 Win Chances").setDescription(chancesDescription).setColor(0x00ff00);

  if (festiveMessages.isPresent) {
    embed.setFooter({ text: festiveMessages.message });
  }

  return new MessageBuilder().addEmbed(embed);
}

function determineReward(isPremium: boolean): { type: RewardType; amount?: number } {
  const random = Math.random();
  let cumulativeProbability = 0;

  const festiveMultiplier = SpecialDayHelper.getSpecialDayMultipliers();

  for (const [reward, { probability }] of Object.entries(REWARDS) as [RewardType, Reward][]) {
    cumulativeProbability += probability;
    if (random < cumulativeProbability) {
      if (reward === "coins") {
        const amount = Math.floor(Math.random() * (isPremium ? 65 : 15)) + 10;
        return {
          type: reward,
          amount: festiveMultiplier.isActive ? amount * festiveMultiplier.coins.multiplier : amount
        };
      } else if (reward === "tickets") {
        const amount = Math.floor(Math.random() * (isPremium ? 3 : 1)) + 1;
        return {
          type: reward,
          amount: festiveMultiplier.isActive ? amount * festiveMultiplier.tickets.multiplier : amount
        };
      } else if (reward === "composterEfficiencyUpgrade") {
        const amount = 1;
        return { type: reward, amount: festiveMultiplier.isActive ? amount * 2 : amount }; // Always 1 level upgrade
      } else if (reward === "composterQualityUpgrade") {
        const amount = 1;
        return { type: reward, amount: festiveMultiplier.isActive ? amount * 2 : amount }; // Always 1 level upgrade
      } else if (reward === "treeSize") {
        const amount = Math.floor(Math.random() * (isPremium ? 25 : 10)) + 1;
        return { type: reward, amount: festiveMultiplier.isActive ? amount * 2 : amount }; // Random 1 to 10 ft for free users, 1 to 25 ft for premium users
      }
      return { type: reward };
    }
  }

  return { type: "coins", amount: 10 };
}

async function applyReward(ctx: ButtonContext, reward: { type: RewardType; amount?: number }): Promise<void> {
  const userId = ctx.user.id;

  switch (reward.type) {
    case "tickets":
      if (reward.amount) {
        await WheelStateHelper.addTickets(userId, reward.amount);
      }
      break;
    case "coins":
      if (reward.amount) {
        await WalletHelper.addCoins(userId, reward.amount);
      }
      break;
    case "composterEfficiencyUpgrade":
      if (ctx.game && reward.amount) {
        ctx.game.composter.efficiencyLevel += reward.amount;
        await ctx.game.save();
      }
      break;
    case "composterQualityUpgrade":
      if (ctx.game && reward.amount) {
        ctx.game.composter.qualityLevel += reward.amount;
        await ctx.game.save();
      }
      break;
    case "treeSize":
      if (ctx.game && reward.amount) {
        ctx.game.size += reward.amount;
        await ctx.game.save();
      }
      break;
    default:
      break;
  }
}
