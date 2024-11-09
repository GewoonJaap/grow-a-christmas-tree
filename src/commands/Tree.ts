import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { calculateTreeTierImage, getCurrentTreeTier } from "../util/tree-tier-calculator";
import { getTreeAge, getWateringInterval } from "../util/watering-inteval";
import humanizeDuration = require("humanize-duration");
import { updateEntitlementsToGame } from "../util/discord/DiscordApiExtensions";
import { minigameButtons, startRandomMinigame } from "../minigames/MinigameFactory";
import { sendAndDeleteWebhookMessage } from "../util/TreeWateringNotification";
import { calculateGrowthChance, calculateGrowthAmount } from "./Composter";

const MINIGAME_CHANCE = 0.4;
const MINIGAME_DELAY_SECONDS = 5 * 60;

const builder = new SlashCommandBuilder("tree", "Display your server's tree.");

builder.setDMEnabled(false);

export class Tree implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) return ctx.reply("This command can only be used in a server.");
    if (ctx.game === null || !ctx.game) return ctx.reply("Use /plant to plant a tree for your server first.");

    return ctx.reply(await buildTreeDisplayMessage(ctx));
  };

  public components = [
    new Button(
      "tree.grow",
      new ButtonBuilder().setEmoji({ name: "💧" }).setStyle(1),
      async (ctx: ButtonContext): Promise<void> => {
        await handleTreeGrow(ctx);
      }
    ),
    new Button(
      "tree.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext): Promise<void> => {
        return ctx.reply(await buildTreeDisplayMessage(ctx));
      }
    ),
    ...minigameButtons
  ];
}

async function handleTreeGrow(ctx: ButtonContext): Promise<void> {
  if (!ctx.game) throw new Error("Game data missing.");

  if (ctx.game.lastWateredBy === ctx.user.id && process.env.DEV_MODE !== "true") {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);

    ctx.reply(SimpleError("You watered this tree last, you must let someone else water it first.").setEphemeral(true));

    transitionToDefaultTreeView(ctx);

    return;
  }

  const wateringInterval = getWateringInterval(ctx.game.size, ctx.game.superThirsty ?? false),
    time = Math.floor(Date.now() / 1000);
  if (ctx.game.lastWateredAt + wateringInterval > time && process.env.DEV_MODE !== "true") {
    const timeout = ctx.timeouts.get(ctx.interaction.message.id);
    if (timeout) clearTimeout(timeout);

    ctx.reply(
      new MessageBuilder().addEmbed(
        new EmbedBuilder()
          .setTitle(`\`\`${ctx.game.name}\`\` is growing already.`)
          .setDescription(
            `It was recently watered by <@${ctx.game.lastWateredBy}>.\n\nYou can next water it: <t:${
              ctx.game.lastWateredAt + wateringInterval
            }:R>`
          )
      )
    );

    transitionToDefaultTreeView(ctx);

    return;
  }

  ctx.game.lastWateredAt = time;
  ctx.game.lastWateredBy = ctx.user.id;

  applyGrowthBoost(ctx);

  const contributor = ctx.game.contributors.find((contributor) => contributor.userId === ctx.user.id);

  if (contributor) {
    contributor.count++;
    contributor.lastWateredAt = time;
  } else {
    ctx.game.contributors.push({ userId: ctx.user.id, count: 1, lastWateredAt: time });
  }

  await ctx.game.save();

  if (
    process.env.DEV_MODE === "true" ||
    (Math.random() < MINIGAME_CHANCE && ctx.game.lastEventAt + MINIGAME_DELAY_SECONDS < Math.floor(Date.now() / 1000))
  ) {
    ctx.game.lastEventAt = Math.floor(Date.now() / 1000);
    await ctx.game.save();
    const minigameStarted = await startRandomMinigame(ctx);
    if (minigameStarted) return;
  }

  return ctx.reply(await buildTreeDisplayMessage(ctx));
}

function applyGrowthBoost(ctx: ButtonContext): void {
  if (!ctx.game) throw new Error("Game data missing.");
  const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
  const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;
  const growthChance = calculateGrowthChance(efficiencyLevel, ctx.game.hasAiAccess);
  const growthAmount = calculateGrowthAmount(qualityLevel, ctx.game.hasAiAccess);

  // Apply growth chance and amount
  if (Math.random() * 100 < growthChance) {
    ctx.game.size += 1 + growthAmount;
  } else {
    ctx.game.size += 1;
  }
}

export function transitionToDefaultTreeView(ctx: ButtonContext, delay = 4000) {
  if (!ctx.game) throw new Error("Game data missing.");
  ctx.timeouts.set(
    ctx.interaction.message.id,
    setTimeout(async () => {
      ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");

      await ctx.edit(await buildTreeDisplayMessage(ctx));
    }, delay)
  );
}

function getSuperThirstyText(ctx: SlashCommandContext | ButtonContext): string {
  if (ctx.game?.superThirsty) {
    return "\n💨This tree is growing faster thanks to the super thirsty upgrade!";
  }
  return "";
}

function getComposterEffectsText(ctx: SlashCommandContext | ButtonContext): string {
  if (ctx.game?.composter) {
    const efficiencyLevel = ctx.game.composter.efficiencyLevel;
    const qualityLevel = ctx.game.composter.qualityLevel;

    if (efficiencyLevel === 0 && qualityLevel === 0) {
      return "\n🎅 Santa's Magic Composter is at level 0. Use /composter to upgrade it and boost your tree's growth!";
    }

    const growthChance = calculateGrowthChance(efficiencyLevel, ctx.game.hasAiAccess ?? false);
    const growthAmount = calculateGrowthAmount(qualityLevel, ctx.game.hasAiAccess ?? false);
    return `\n🎅 Santa's Magic Composter is at level ${
      efficiencyLevel + qualityLevel
    }, providing a ${growthChance}% chance to grow ${growthAmount}ft more!`;
  }
  return "\n🎅 Santa's Magic Composter is at level 0. Use /composter to upgrade it and boost your tree's growth!";
}

export async function buildTreeDisplayMessage(ctx: SlashCommandContext | ButtonContext): Promise<MessageBuilder> {
  if (!ctx.game) throw new Error("Game data missing.");

  await updateEntitlementsToGame(ctx);

  const actionBuilder = new ActionRowBuilder().addComponents(
    await ctx.manager.components.createInstance("tree.grow"),
    await ctx.manager.components.createInstance("tree.refresh")
  );
  const message = new MessageBuilder().addComponents(actionBuilder);

  const canBeWateredAt = ctx.game.lastWateredAt + getWateringInterval(ctx.game.size, ctx.game.superThirsty ?? false);

  const embed = new EmbedBuilder().setTitle(ctx.game.name);
  const time = Math.floor(Date.now() / 1000);

  const treeImage = await calculateTreeTierImage(
    ctx.game.size,
    ctx.game.hasAiAccess ?? false,
    ctx.game.id,
    ctx.game.currentImageUrl
  );
  ctx.game.currentImageUrl = treeImage.image;
  await ctx.game.save();

  embed.setImage(treeImage.image);

  embed.setFooter({
    text: `Your christmas tree${ctx.game.hasAiAccess ? "✨" : ""} (lvl. ${getCurrentTreeTier(
      ctx.game.size,
      ctx.game.hasAiAccess
    )}) has spent ${humanizeDuration(
      ctx.game.lastWateredAt + getWateringInterval(ctx.game.size, ctx.game.superThirsty ?? false) < time
        ? getTreeAge(ctx.game.size) * 1000
        : (getTreeAge(ctx.game.size - 1) + time - ctx.game.lastWateredAt) * 1000
    )} growing. Nice!`
  });

  if (canBeWateredAt < Date.now() / 1000) {
    embed.setDescription(
      `**Your tree is ${ctx.game.size}ft tall.**\n\nLast watered by: <@${
        ctx.game.lastWateredBy
      }>\n**Ready to be watered!**${
        (ctx.game.hasAiAccess ?? false) == false
          ? "\nEnjoy unlimited levels, fun minigames, watering notifications and more via the [shop](https://discord.com/application-directory/1050722873569968128/store)! Just click [here](https://discord.com/application-directory/1050722873569968128/store) or on the bot avatar to access the shop."
          : "\nThis server has access to unlimited levels, minigames and more!"
      }${getSuperThirstyText(ctx)}${getComposterEffectsText(ctx)}`
    );
  } else {
    embed.setDescription(
      `**Your tree is ${ctx.game.size}ft tall.**\n\nLast watered by: <@${
        ctx.game.lastWateredBy
      }>\n*Your tree is growing, come back <t:${canBeWateredAt}:R>.*${
        (ctx.game.hasAiAccess ?? false) == false
          ? "\nEnjoy unlimited levels, fun minigames, watering notifications and more via the [shop](https://discord.com/application-directory/1050722873569968128/store)! Just click [here](https://discord.com/application-directory/1050722873569968128/store) or on the bot avatar to access the shop."
          : "\nThis server has access to unlimited levels, minigames and more!"
      }${getSuperThirstyText(ctx)}${getComposterEffectsText(ctx)}`
    );

    if (ctx.interaction.message && !ctx.timeouts.has(ctx.interaction.message.id)) {
      ctx.timeouts.set(
        ctx.interaction.message.id,
        setTimeout(async () => {
          ctx.timeouts.delete(ctx.interaction?.message?.id ?? "broken");
          sendWebhookOnWateringReady(ctx);
          await ctx.edit(await buildTreeDisplayMessage(ctx));
        }, canBeWateredAt * 1000 - Date.now())
      );
    }
  }

  message.addEmbed(embed);

  return message;
}

async function sendWebhookOnWateringReady(ctx: SlashCommandContext | ButtonContext) {
  if (
    ctx.game &&
    (ctx.game.hasAiAccess || process.env.DEV_MODE) &&
    ctx.game.notificationRoleId &&
    ctx.game.webhookId &&
    ctx.game.webhookToken
  ) {
    await sendAndDeleteWebhookMessage(
      ctx.game.webhookId,
      ctx.game.webhookToken,
      ctx.game.notificationRoleId,
      "The tree is ready to be watered! 🌲💧"
    );
  }
}
