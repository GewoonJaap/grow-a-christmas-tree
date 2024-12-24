import {
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SimpleError,
  SlashCommandBuilder,
  SlashCommandContext,
  SlashCommandStringOption
} from "interactions.ts";
import { Guild } from "../models/Guild";
import { validateTreeName } from "../util/validate-tree-name";
import { BanHelper } from "../util/bans/BanHelper";
import { UnleashHelper, UNLEASH_FEATURES } from "../util/unleash/UnleashHelper";
import { safeReply } from "../util/discord/MessageExtenstions";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const builder = new SlashCommandBuilder("plant", "Plant a Christmas Tree for Your Server").addStringOption(
  new SlashCommandStringOption("name", "Give your server's tree a festive name").setRequired(true)
);

builder.setDMEnabled(false);

export class Plant implements ISlashCommand {
  public builder = builder;

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    const tracer = trace.getTracer("grow-a-tree");
    return tracer.startActiveSpan("PlantCommandHandler", async (span) => {
      try {
        if (ctx.isDM) return await safeReply(ctx, SimpleError("This command can only be used in a server."));
        if (ctx.game !== null)
          return await safeReply(
            ctx,
            new MessageBuilder().setContent(
              `A christmas tree has already been planted in this server called \`\`${ctx.game.name}\`\`.`
            )
          );
        if (UnleashHelper.isEnabled(UNLEASH_FEATURES.banEnforcement, ctx) && (await BanHelper.isUserBanned(ctx.user.id))) {
          return await safeReply(ctx, BanHelper.getBanEmbed(ctx.user.username));
        }
        if (ctx.interaction.guild_id === undefined) return await safeReply(ctx, SimpleError("Guild ID missing."));

        const name = ctx.options.get("name")?.value as string | undefined;
        if (name === undefined) return await safeReply(ctx, SimpleError("Name not found."));

        if (!(await validateTreeName(name)))
          return await safeReply(
            ctx,
            new MessageBuilder().addEmbed(
              new EmbedBuilder()
                .setTitle("Invalid Tree Name")
                .setDescription(
                  "Your Christmas tree name must be between 1-36 characters, can only contain alphanumeric characters, hyphens, and apostrophes, and must not contain profanity. ✨"
                )
            )
          );

        await new Guild({
          id: ctx.interaction.guild_id,

          name: name,

          lastWateredAt: Math.floor(Date.now() / 1000),
          lastWateredBy: ctx.user.id,

          contributors: [
            {
              userId: ctx.user.id,
              count: 1
            }
          ]
        }).save();

        span.setStatus({ code: SpanStatusCode.OK });
        return await safeReply(
          ctx,
          new MessageBuilder().addEmbed(
            new EmbedBuilder()
              .setTitle("🎄 Tree Planted!")
              .setDescription(`You've planted \`\`${name}\`\` in your server! Watch it grow! ✨🌟`)
              .setFooter({ text: `Run /tree to start growing **${name}** and watch your Christmas tree thrive! ✨🌱` })
          )
        );
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  };

  public components = [];
}
