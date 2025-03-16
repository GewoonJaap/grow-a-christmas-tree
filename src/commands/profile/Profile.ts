import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandUserOption
} from "interactions.ts";
import { updateEntitlementsToGame } from "../../util/discord/DiscordApiExtensions";
import { WalletHelper } from "../../util/wallet/WalletHelper";
import { BanHelper } from "../../util/bans/BanHelper";
import { CHEATER_CLOWN_EMOJI } from "../../util/const";
import { UnleashHelper, UNLEASH_FEATURES } from "../../util/unleash/UnleashHelper";
import { AchievementHelper } from "../../util/achievement/AchievementHelper";
import { SpecialDayHelper } from "../../util/special-days/SpecialDayHelper";
import { safeReply } from "../../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { Achievements } from "./categories/Achievements";
import { getRandomElement } from "../../util/helpers/arrayHelper";
import { IContributor } from "../../models/Guild";
import { Wallet } from "../../models/Wallet";
import { IAchievement } from "../../models/Achievement";

type State = {
  id: string;
  nick: string;
  page: number;
};

const builder = new SlashCommandBuilder("profile", "View a user's contributions to the christmas tree.").addUserOption(
  new SlashCommandUserOption("target", "User whose profile you want to view.")
);

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/profile/profile-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/profile/profile-2.jpg"
];

builder.setDMEnabled(false);

export class Profile implements ISlashCommand {
  private categories = [new Achievements()];

  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM || !ctx.game)
      return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
    await updateEntitlementsToGame(ctx);
    return await safeReply(ctx, await buildProfileMessage(ctx));
  };

  public components = [
    ...this.categories.flatMap((category) => category.components),
    new Button(
      "profile.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(1),
      async (ctx: ButtonContext<State>): Promise<void> => {
        return await safeReply(ctx, await buildProfileMessage(ctx));
      }
    ),
    new Button(
      "profile.main",
      new ButtonBuilder().setEmoji({ name: "👤" }).setStyle(1).setLabel("Main Profile"),
      async (ctx: ButtonContext<State>): Promise<void> => {
        return await safeReply(ctx, await buildProfileMessage(ctx));
      }
    )
  ];
}

/**
 * Extract user information from the context
 */
function extractUserInfo(ctx: SlashCommandContext | ButtonContext<State>): { id: string; nick: string } {
  if (ctx instanceof SlashCommandContext || !ctx.state) {
    const target =
      ctx instanceof SlashCommandContext && ctx.options.has("target")
        ? ctx.interaction.data.resolved?.users?.[ctx.options.get("target")?.value as string]
        : undefined;

    const id = target ? target.id : ctx.user.id;
    const nick =
      ctx instanceof SlashCommandContext && target
        ? ctx.interaction.data?.resolved?.members?.[id]?.nick ?? target.username
        : ctx.interaction.member?.nick ?? ctx.user.username;

    return { id, nick };
  } else {
    return {
      id: ctx.state.id,
      nick: ctx.state.nick
    };
  }
}

/**
 * Build the profile title with appropriate decoration
 */
function buildProfileTitle(nick: string, isBanned: boolean): string {
  return `${isBanned ? CHEATER_CLOWN_EMOJI : ""}❄️ ${nick}'s Festive Journey ❄️`;
}

/**
 * Build the tree tending progress section
 */
function buildTreeTendingSection(
  isOwnProfile: boolean,
  contributor: IContributor | undefined,
  treeName: string,
  contributorRank: number,
  totalContributors: number
): string {
  const header = "🎄 **TREE TENDING PROGRESS** 🎄\n";
  const subject = isOwnProfile ? "You have" : "This wonderful elf has";

  if (!contributor) {
    return `${header}${subject} not yet sprinkled holiday magic on the christmas tree. Time to spread some cheer!`;
  }

  const rankText = isOwnProfile ? "You're" : "They're";
  return `${header}${subject} lovingly watered \`\`${treeName}\`\` ${contributor.count} times! ${rankText} ranked #${contributorRank} out of ${totalContributors} holiday helpers!`;
}

/**
 * Build the treasures section
 */
function buildTreasuresSection(wallet: any): string {
  const coins = wallet ? wallet.coins : 0;
  const streak = wallet ? wallet.streak : 0;
  const streakSuffix = streak === 1 ? "" : "s";

  return `✨ **HOLIDAY TREASURES** ✨\n🪙 Gift Coins: ${coins} shiny coins in your stocking!\n\n🔥 Festive Streak: ${streak} magical day${streakSuffix} of continuous holiday spirit!`;
}

/**
 * Build the achievements section
 */
function buildAchievementsSection(achievements: any[]): string {
  const achievementsCount = achievements.length;
  const ornamentText = achievementsCount === 1 ? "ornament" : "ornaments";

  const actionText =
    achievementsCount > 0 ? "Click the Achievements button to admire your collection!" : "Start your collection today!";

  return `🏆 **ACHIEVEMENTS COLLECTION** 🏆\nYou've earned ${achievementsCount} special ${ornamentText} for your achievement tree!\n${actionText}`;
}

/**
 * Build the profile description with all content sections
 */
function buildProfileDescription(
  ctx: SlashCommandContext | ButtonContext<State>,
  userId: string,
  contributor: IContributor | undefined,
  wallet: InstanceType<typeof Wallet>,
  contributorRank: number,
  achievements: IAchievement[],
  treeName: string,
  totalContributors: number
): string {
  // Build each section separately
  const isOwnProfile = ctx.user.id === userId;

  // Section 1: Tree Tending Progress
  const treeTendingSection = buildTreeTendingSection(
    isOwnProfile,
    contributor,
    treeName,
    contributorRank,
    totalContributors
  );

  // Section 2: Holiday Treasures
  const treasuresSection = buildTreasuresSection(wallet);

  // Section 3: Achievements Collection
  const achievementsSection = buildAchievementsSection(achievements);

  // Combine all sections
  return `${treeTendingSection}\n\n${treasuresSection}\n\n${achievementsSection}`;
}

/**
 * Build the footer text
 */
function buildFooterText(festiveMessage: { message: string; isPresent: boolean }): string {
  return festiveMessage.isPresent
    ? `🎁 ${festiveMessage.message}`
    : "🎄 Grow the most magical tree this holiday season! 🎄";
}

async function buildProfileMessage(ctx: SlashCommandContext | ButtonContext<State>): Promise<MessageBuilder> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("buildProfileMessage", async (span) => {
    try {
      if (!ctx.game) throw new Error("Game data missing.");

      // Extract user information
      const { id, nick } = extractUserInfo(ctx);

      // Get user data
      const contributor = ctx.game.contributors.find((contributor) => contributor.userId === id);
      const wallet = await WalletHelper.getWallet(id);
      const cheaterClownEnabled = UnleashHelper.isEnabled(UNLEASH_FEATURES.showCheaterClown, ctx);
      const isBanned = cheaterClownEnabled && (await BanHelper.isUserBanned(id));
      const achievements = await AchievementHelper.getAchievements(id);

      const contributorRank =
        ctx.game.contributors.sort((a, b) => b.count - a.count).findIndex((contributor) => contributor.userId === id) +
        1;

      // Build UI
      const actionRow = new ActionRowBuilder().addComponents(
        await ctx.manager.components.createInstance("profile.refresh", { id, nick }),
        await ctx.manager.components.createInstance("profile.achievements", { id, nick })
      );

      // Get festive message
      const festiveMessage = SpecialDayHelper.getFestiveMessage();

      // Build profile sections
      const profileTitle = buildProfileTitle(nick, isBanned);
      const description = buildProfileDescription(
        ctx,
        id,
        contributor,
        wallet,
        contributorRank,
        achievements,
        ctx.game.name,
        ctx.game.contributors.length
      );
      const footerText = buildFooterText(festiveMessage);

      span.setStatus({ code: SpanStatusCode.OK });
      return new MessageBuilder()
        .addEmbed(
          new EmbedBuilder()
            .setTitle(profileTitle)
            .setDescription(description)
            .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
            .setFooter({ text: footerText })
        )
        .addComponents(actionRow);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
