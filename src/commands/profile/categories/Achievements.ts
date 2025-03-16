import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  MessageBuilder,
  SlashCommandContext
} from "interactions.ts";
import { AchievementHelper } from "../../../util/achievement/AchievementHelper";
import { SpecialDayHelper } from "../../../util/special-days/SpecialDayHelper";
import { PartialCommand } from "../../../util/types/command/PartialCommandType";
import { safeReply } from "../../../util/discord/MessageExtenstions";
import { getRandomElement } from "../../../util/helpers/arrayHelper";
import { IAchievement } from "../../../models/Achievement";

type AchievementsState = {
  id: string;
  nick: string;
  page: number;
};

// Achievement showcase images
const ACHIEVEMENT_IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/profile/achievements/achievements-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/profile/achievements/achievements-2.jpg"
];

export class Achievements implements PartialCommand {
  public entryButtonName = "profile.achievements";

  public components: Button[] = [
    new Button(
      this.entryButtonName,
      new ButtonBuilder().setEmoji({ name: "🏆" }).setStyle(1).setLabel("Achievements"),
      async (ctx: ButtonContext): Promise<void> => {
        const state: AchievementsState = {
          id: ctx.user.id,
          nick: ctx.user.username,
          page: 1
        };
        return safeReply(ctx, await this.buildAchievementsMessage(ctx, state));
      }
    ),
    new Button(
      "profile.achievements.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2),
      async (ctx: ButtonContext<AchievementsState>): Promise<void> => {
        if (!ctx.state) return;
        return safeReply(ctx, await this.buildAchievementsMessage(ctx, ctx.state));
      }
    ),
    new Button(
      "profile.achievements.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2),
      async (ctx: ButtonContext<AchievementsState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return safeReply(ctx, await this.buildAchievementsMessage(ctx, ctx.state));
      }
    ),
    new Button(
      "profile.achievements.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2),
      async (ctx: ButtonContext<AchievementsState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return safeReply(ctx, await this.buildAchievementsMessage(ctx, ctx.state));
      }
    )
  ];

  /**
   * Format a single achievement with festive flair
   */
  private formatAchievement(achievement: IAchievement): string {
    const dateFormatted = achievement.dateEarned.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    return `${achievement.emoji} **${achievement.achievementName}** ${achievement.emoji}\n${achievement.description}\n✨ *Earned on ${dateFormatted}* ✨\n`;
  }

  /**
   * Build the title for the achievements page
   */
  private buildAchievementsTitle(nick: string): string {
    return `🎄 ${nick}'s Festive Achievements Collection 🎄`;
  }

  /**
   * Build the empty achievements message
   */
  private buildEmptyAchievementsMessage(): string {
    return (
      "✨ *Your achievements tree is just waiting to be decorated!* ✨\n\n" +
      "Keep spreading holiday cheer and taking care of your tree to earn special achievements.\n\n" +
      "Return to the main profile and participate in festive activities to start your collection!"
    );
  }

  /**
   * Build the achievements description with header
   */
  private buildAchievementsDescription(achievements: IAchievement[], paginatedAchievements: IAchievement[]): string {
    if (paginatedAchievements.length === 0) {
      return this.buildEmptyAchievementsMessage();
    }

    const achievementsHeader =
      `🌟 **MAGICAL ACCOMPLISHMENTS** 🌟\n` +
      `Showing ${paginatedAchievements.length} out of ${achievements.length} special ornaments\n\n`;

    const achievementsContent = paginatedAchievements
      .map((achievement) => this.formatAchievement(achievement))
      .join("\n");

    return achievementsHeader + achievementsContent;
  }

  public async buildAchievementsMessage(
    ctx: ButtonContext<AchievementsState> | SlashCommandContext,
    state?: AchievementsState
  ): Promise<MessageBuilder> {
    if (!ctx.game) {
      return new MessageBuilder().setContent("This command can only be used in a server.");
    }

    // Set default state if not provided
    const userState = state || {
      id: ctx.user.id,
      nick: ctx.user.username,
      page: 1
    };

    const achievements = await AchievementHelper.getAchievements(userState.id);

    const achievementsPerPage = 5;
    const start = (userState.page - 1) * achievementsPerPage;
    const paginatedAchievements = achievements.slice(start, start + achievementsPerPage);

    // Get a random image for the embed
    const randomImage = getRandomElement(ACHIEVEMENT_IMAGES) ?? ACHIEVEMENT_IMAGES[0];

    // Build achievements content
    const achievementsDescription = this.buildAchievementsDescription(achievements, paginatedAchievements);

    // Create navigation buttons
    const actionRow = new ActionRowBuilder().addComponents(
      await ctx.manager.components.createInstance("profile.achievements.refresh", userState),
      await ctx.manager.components.createInstance("profile.main", userState)
    );

    if (userState.page > 1) {
      actionRow.addComponents(await ctx.manager.components.createInstance("profile.achievements.back", userState));
    }

    if (achievements.length > start + achievementsPerPage) {
      actionRow.addComponents(await ctx.manager.components.createInstance("profile.achievements.next", userState));
    }

    const festiveMessage = SpecialDayHelper.getFestiveMessage();
    const totalPages = Math.ceil(achievements.length / achievementsPerPage) || 1;

    const embed = new EmbedBuilder()
      .setTitle(this.buildAchievementsTitle(userState.nick))
      .setDescription(achievementsDescription)
      .setImage(randomImage)
      .setFooter({
        text: `Page ${userState.page}/${totalPages}${
          festiveMessage.isPresent
            ? " • " + festiveMessage.message
            : " • Keep collecting achievements to complete your tree!"
        }`
      });

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }
}
