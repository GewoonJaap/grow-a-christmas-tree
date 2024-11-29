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

type RewardType = "tickets" | "coins" | "composterUpgrade" | "nothing";

interface Reward {
  displayName: string;
  probability: number;
}

const REWARDS: Record<RewardType, Reward> = {
  tickets: { displayName: "Tickets", probability: 0.3 },
  coins: { displayName: "Coins", probability: 0.5 },
  composterUpgrade: { displayName: "Composter Upgrade", probability: 0.15 },
  nothing: { displayName: "Nothing", probability: 0.05 }
};

export class Wheel implements ISlashCommand {
  public builder = new SlashCommandBuilder("wheel", "Give it a whirl and unwrap festive rewards! 🎅✨");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
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
    ),
    new Button(
      "wheel.chances",
      new ButtonBuilder().setEmoji({ name: "📊" }).setStyle(2).setLabel("Win Chances"),
      async (ctx: ButtonContext): Promise<void> => {
        return await ctx.reply(await showWinChances(ctx));
      }
    )
  ];
}

async function buildWheelMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const userId = ctx.user.id;
  const wheelState = await WheelStateHelper.getWheelState(userId);

  const embed = new EmbedBuilder()
    .setTitle("🎅 Santa's Lucky Spin! 🎁")
    .setDescription(
      `🎁 **Spin Santa's Wheel of Fortune!** 🎄 Use your ${wheelState.tickets} ticket${
        wheelState.tickets === 1 ? "" : "s"
      } to win coins, tickets, and festive composter upgrades! 🎅✨`
    )
    .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

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

  const userId = ctx.user.id;
  const wheelState = await WheelStateHelper.getWheelState(userId);

  if (wheelState.tickets <= 0) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("🎅 Santa's Lucky Spin! 🎁")
        .setDescription("🎟️ **You need at least one ticket to give the wheel a spin!** 🎄")
        .setColor(0xff0000)
        .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png")
    );
  }

  const hasSpinnedWheel = await WheelStateHelper.spinWheel(userId);

  if (!hasSpinnedWheel) {
    const embed = new EmbedBuilder()
      .setTitle("🎅 Santa's Lucky Spin! 🎁")
      .setDescription("🎟️ **You need at least one ticket to give the wheel a spin!** 🎄")
      .setColor(0xff0000)
      .setImage("https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/wheel/wheel-1.png");

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

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("wheel.spin"),
    await ctx.manager.components.createInstance("wheel.refresh"),
    await ctx.manager.components.createInstance("wheel.chances")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function showWinChances(ctx: ButtonContext): Promise<MessageBuilder> {
  const chancesDescription = Object.entries(REWARDS)
    .map(([key, { displayName, probability }]) => `**${displayName}:** ${(probability * 100).toFixed(2)}%`)
    .join("\n");

  const embed = new EmbedBuilder().setTitle("🎰 Win Chances").setDescription(chancesDescription).setColor(0x00ff00);

  return new MessageBuilder().addEmbed(embed);
}

function determineReward(isPremium: boolean): { type: RewardType; amount?: number } {
  const random = Math.random();
  let cumulativeProbability = 0;

  for (const [reward, { probability }] of Object.entries(REWARDS)) {
    cumulativeProbability += probability;
    if (random < cumulativeProbability) {
      if (reward === "coins") {
        return { type: reward as RewardType, amount: Math.floor(Math.random() * (isPremium ? 100 : 50)) };
      }
      return { type: reward as RewardType };
    }
  }

  return { type: "nothing" };
}

async function applyReward(ctx: ButtonContext, reward: { type: RewardType; amount?: number }): Promise<void> {
  const userId = ctx.user.id;

  switch (reward.type) {
    case "tickets":
      await WheelStateHelper.addTickets(userId, 1);
      break;
    case "coins":
      if (reward.amount) {
        await WalletHelper.addCoins(userId, reward.amount);
      }
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
