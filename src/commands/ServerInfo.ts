import {
  SlashCommandBuilder,
  SlashCommandContext,
  ISlashCommand,
  EmbedBuilder,
  MessageBuilder,
  AutocompleteContext,
  Component,
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext
} from "interactions.ts";
import { PremiumButtons } from "../util/buttons/PremiumButtons";
import { getRandomElement } from "../util/helpers/arrayHelper";
import humanizeDuration = require("humanize-duration");
import { BoosterHelper } from "../util/booster/BoosterHelper";
import { SpecialDayHelper } from "../util/special-days/SpecialDayHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const IMAGES = [
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/server-info/server-info-1.jpg",
  "https://grow-a-christmas-tree.ams3.cdn.digitaloceanspaces.com/server-info/server-info-2.jpg"
];

export class ServerInfo implements ISlashCommand {
  autocompleteHandler?: ((ctx: AutocompleteContext) => Promise<void>) | undefined;

  components: Component[] = [
    new Button(
      "serverinfo.refresh",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(2).setLabel("Refresh"),
      async (ctx: ButtonContext): Promise<void> => {
        const message = await this.buildServerInfoEmbed(ctx);
        await safeReply(ctx, message);
      }
    )
  ];

  public builder = new SlashCommandBuilder(
    "serverinfo",
    "See Santa's magic status, tree thirst, composter upgrades and active boosters at a glance! 🎅✨"
  );

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) {
      return await safeReply(ctx, new MessageBuilder().setContent("This command can only be used in a server."));
    }
    if (!ctx.game) {
      return await safeReply(ctx, new MessageBuilder().setContent("No game data found for this server."));
    }

    const embed = await this.buildServerInfoEmbed(ctx);

    return await safeReply(ctx, embed);
  };

  private getActiveBoostersText(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): string {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getActiveBoostersText", (span) => {
      try {
        const boosters = BoosterHelper.getActiveBoosters(ctx);
        if (ctx.game?.activeBoosters && boosters.length > 0) {
          const activeBoosters = boosters.map((booster) => {
            const remainingTime = booster.startTime + booster.duration - Math.floor(Date.now() / 1000);
            return `**${booster.type}** (${humanizeDuration(remainingTime * 1000)} remaining)`;
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return `${activeBoosters.join(", ")}`;
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return "No active boosters";
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private getUnlockedTreeStylesText(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): string {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("getUnlockedTreeStylesText", (span) => {
      try {
        const unlockedTreeStyles = ctx.game?.treeStyles ?? [];
        if (unlockedTreeStyles.length) {
          const displayedStyles = unlockedTreeStyles.slice(0, 10);
          const remainingStylesCount = unlockedTreeStyles.length - displayedStyles.length;
          const stylesText = displayedStyles
            .map((style) => `🎄 **${style.styleName}**${style.active ? "✅" : "❌"}`)
            .join("\n");
          span.setStatus({ code: SpanStatusCode.OK });
          return remainingStylesCount > 0 ? `${stylesText}\n...and ${remainingStylesCount} more styles` : stylesText;
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return "No unlocked tree styles";
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async buildServerInfoEmbed(
    ctx: SlashCommandContext | ButtonContext<unknown> | ButtonContext
  ): Promise<MessageBuilder> {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("buildServerInfoEmbed", async (span) => {
      try {
        if (!ctx.game) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "No game data found for this server." });
          return new MessageBuilder().addEmbed(new EmbedBuilder().setTitle("No game data found for this server."));
        }
        const hasAiAccess = ctx.game.hasAiAccess;
        const superThirsty = ctx.game.superThirsty;
        const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
        const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

        const festiveMessage = SpecialDayHelper.getFestiveMessage();

        const messageBuilder = new MessageBuilder();
        const embed = new EmbedBuilder()
          .setTitle("🎇 The Sparkling Christmas Tree")
          .setDescription(
            `**🎅Festive Forest access:** ${hasAiAccess ? "Yes 🎁" : "No ❄️"}\n` +
              `**💧 Elf's Thirsty Boost access:** ${superThirsty ? "Active 🌊" : "Inactive 🎄"}\n` +
              `**🧝 Composter Efficiency Level:** ${efficiencyLevel} 🛠️\n` +
              `**✨ Composter Quality Level:** ${qualityLevel} 🌟\n\n` +
              `**Active Boosters:**\n${this.getActiveBoostersText(ctx)}\n` +
              `**Unlocked Tree Styles:**\n${this.getUnlockedTreeStylesText(ctx)}` +
              `${festiveMessage.isPresent ? `\n\n${festiveMessage.message}` : ""}`
          )
          .setColor(0x00ff00)
          .setImage(getRandomElement(IMAGES) ?? IMAGES[0])
          .setFooter({ text: "Let it grow, let it glow! 🌟❄️" });

        const actionRow = new ActionRowBuilder();
        if (!process.env.DEV_MODE) {
          if (!ctx.game.hasAiAccess) {
            actionRow.addComponents(PremiumButtons.FestiveForestButton);
          }
          if (!ctx.game.superThirsty) {
            actionRow.addComponents(PremiumButtons.SuperThirstyButton);
          }
        }

        actionRow.addComponents(await ctx.manager.components.createInstance("serverinfo.refresh"));

        messageBuilder.addComponents(actionRow);

        span.setStatus({ code: SpanStatusCode.OK });
        return messageBuilder.addEmbed(embed);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
