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
import { Guild } from "../models/Guild";
import { WalletHelper } from "../util/wallet/WalletHelper";

const BASE_COST = 100;
const COST_INCREMENT = 50;
const BASE_GROWTH_BOOST = 5;
const DIMINISHING_RETURN_LEVEL = 5;

export class Composter implements ISlashCommand {
  public builder = new SlashCommandBuilder("composter", "View and upgrade Santa’s Magic Composter.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return ctx.reply(await buildComposterMessage(ctx));
  };

  public components = [
    new Button(
      "composter.upgrade",
      new ButtonBuilder().setEmoji({ name: "🔼" }).setStyle(1).setLabel("Upgrade"),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await handleUpgrade(ctx));
      }
    )
  ];
}

async function buildComposterMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  const guild = await Guild.findOne({ id: ctx.interaction.guild_id });
  if (!guild) throw new Error("Guild not found.");

  const efficiencyLevel = guild.composter?.efficiencyLevel ?? 0;
  const qualityLevel = guild.composter?.qualityLevel ?? 0;

  const upgradeCost = BASE_COST + (efficiencyLevel + qualityLevel) * COST_INCREMENT;
  const growthBoost = calculateGrowthBoost(efficiencyLevel + qualityLevel);

  const embed = new EmbedBuilder()
    .setTitle("Santa’s Magic Composter")
    .setDescription(
      `**Current Level:** ${efficiencyLevel + qualityLevel}\n**Upgrade Cost:** ${upgradeCost} coins\n**Growth Boost:** ${growthBoost}%\n\nUpgrade the composter to make your tree grow faster!`
    );

  const actionRow = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("composter.upgrade")
  );

  return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
}

async function handleUpgrade(ctx: ButtonContext): Promise<MessageBuilder> {
  const guild = await Guild.findOne({ id: ctx.interaction.guild_id });
  if (!guild) throw new Error("Guild not found.");

  const efficiencyLevel = guild.composter?.efficiencyLevel ?? 0;
  const qualityLevel = guild.composter?.qualityLevel ?? 0;

  const upgradeCost = BASE_COST + (efficiencyLevel + qualityLevel) * COST_INCREMENT;
  const wallet = await WalletHelper.getWallet(ctx.user.id);

  if (wallet.coins < upgradeCost) {
    return new MessageBuilder().addEmbed(
      new EmbedBuilder()
        .setTitle("Upgrade Failed")
        .setDescription(`You need ${upgradeCost} coins to upgrade the composter.`)
        .setColor(0xff0000)
    );
  }

  wallet.coins -= upgradeCost;
  await wallet.save();

  if (efficiencyLevel <= qualityLevel) {
    guild.composter.efficiencyLevel++;
  } else {
    guild.composter.qualityLevel++;
  }

  await guild.save();

  return buildComposterMessage(ctx);
}

function calculateGrowthBoost(level: number): number {
  if (level <= DIMINISHING_RETURN_LEVEL) {
    return level * BASE_GROWTH_BOOST;
  }
  return DIMINISHING_RETURN_LEVEL * BASE_GROWTH_BOOST + (level - DIMINISHING_RETURN_LEVEL);
}
