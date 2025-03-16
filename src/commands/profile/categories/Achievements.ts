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

type AchievementsState = {
  id: string;
  nick: string;
  page: number;
};

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

    const achievementsDescription =
      paginatedAchievements.length > 0
        ? paginatedAchievements
            .map(
              (achievement) =>
                `${achievement.emoji} **${achievement.achievementName}**\n${
                  achievement.description
                }\nEarned on: ${achievement.dateEarned.toDateString()}\n`
            )
            .join("\n")
        : "No achievements earned yet.";

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

    const embed = new EmbedBuilder()
      .setTitle(`${userState.nick}'s Achievements`)
      .setDescription(achievementsDescription)
      .setFooter({
        text: `Page ${userState.page}/${Math.ceil(achievements.length / achievementsPerPage) || 1}${
          festiveMessage.isPresent ? " • " + festiveMessage.message : ""
        }`
      });

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }
}
