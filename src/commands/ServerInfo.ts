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
        await ctx.reply(message);
      }
    )
  ];

  public builder = new SlashCommandBuilder(
    "serverinfo",
    "See Santa's magic status, tree thirst, and composter upgrades at a glance! 🎅✨"
  );

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    if (ctx.isDM) {
      return await ctx.reply("This command can only be used in a server.");
    }
    if (!ctx.game) {
      return await ctx.reply("No game data found for this server.");
    }

    const embed = await this.buildServerInfoEmbed(ctx);

    return await ctx.reply(embed);
  };

  private async buildServerInfoEmbed(
    ctx: SlashCommandContext | ButtonContext<unknown> | ButtonContext
  ): Promise<MessageBuilder> {
    if (!ctx.game) {
      return new MessageBuilder().addEmbed(new EmbedBuilder().setTitle("No game data found for this server."));
    }
    const hasAiAccess = ctx.game.hasAiAccess;
    const superThirsty = ctx.game.superThirsty;
    const efficiencyLevel = ctx.game.composter?.efficiencyLevel ?? 0;
    const qualityLevel = ctx.game.composter?.qualityLevel ?? 0;

    const messageBuilder = new MessageBuilder();
    const embed = new EmbedBuilder()
      .setTitle("🎇 The Sparkling Christmas Tree")
      .setDescription(
        `**🎅Festive Forest access:** ${hasAiAccess ? "Yes 🎁" : "No ❄️"}\n` +
          `**💧 Elf's Thirsty Boost access:** ${superThirsty ? "Active 🌊" : "Inactive 🎄"}\n` +
          `**🧝 Composter Efficiency Level:** ${efficiencyLevel} 🛠️\n` +
          `**✨ Composter Quality Level:** ${qualityLevel} 🌟`
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

    return messageBuilder.addEmbed(embed);
  }
}
