import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SelectMenuBuilder,
  SelectMenuOptionBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { Guild, IUnlockedTreeStyle } from "../models/Guild";

const STYLES_PER_PAGE = 25;

type StylesButtonState = {
  page: number;
};

export class Styles implements ISlashCommand {
  public builder = new SlashCommandBuilder("styles", "Manage your unlocked tree styles.");

  public handler = async (ctx: SlashCommandContext): Promise<void> => {
    return await ctx.reply(await this.buildStylesMessage(ctx));
  };

  public components = [
    new Button(
      "styles.next",
      new ButtonBuilder().setEmoji({ name: "▶️" }).setStyle(2).setLabel("Next"),
      async (ctx: ButtonContext<StylesButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page++;
        return ctx.reply(await this.buildStylesMessage(ctx));
      }
    ),
    new Button(
      "styles.back",
      new ButtonBuilder().setEmoji({ name: "◀️" }).setStyle(2).setLabel("Back"),
      async (ctx: ButtonContext<StylesButtonState>): Promise<void> => {
        if (!ctx.state) return;

        ctx.state.page--;
        return ctx.reply(await this.buildStylesMessage(ctx));
      }
    ),
    new Button(
      "styles.toggle",
      new ButtonBuilder().setEmoji({ name: "🔄" }).setStyle(1).setLabel("Toggle Style"),
      async (ctx: ButtonContext): Promise<void> => {
        console.log(ctx.interaction.data);
        const selectedStyle = null;
        if (!selectedStyle) return;

        const guild = await Guild.findOne({ id: ctx.interaction.guild_id });
        if (!guild) return;

        const style = guild.unlockedTreeStyles.find((s) => s.styleName === selectedStyle);
        if (!style) return;

        style.active = !style.active;

        await guild.save();
        return ctx.reply(await this.buildStylesMessage(ctx));
      }
    )
  ];

  private async buildStylesMessage(
    ctx: SlashCommandContext | ButtonContext<StylesButtonState>
  ): Promise<MessageBuilder> {
    const state: StylesButtonState =
      ctx instanceof SlashCommandContext || !this.isStateValid(ctx.state)
        ? { page: 1 }
        : (ctx.state as StylesButtonState);

    const guild = await Guild.findOne({ id: ctx.interaction.guild_id });
    if (!guild) return new MessageBuilder().setContent("Guild not found.");

    const unlockedStyles = guild.unlockedTreeStyles;
    const paginatedStyles = this.paginateStyles(unlockedStyles, state.page);

    console.log(paginatedStyles);

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Manage Tree Styles** 🎁")
      .setDescription("Enable or disable your unlocked tree styles.")
      .setFooter({ text: `Page ${state.page}/${Math.ceil(unlockedStyles.length / STYLES_PER_PAGE)}` });

    const options = paginatedStyles.map((style) => {
      console.log(style);
      return new SelectMenuOptionBuilder()
        .setLabel(style.styleName)
        .setValue(style.styleName)
        .setDescription(style.active ? "Enabled" : "Disabled")
        .setDefault(style.active);
    });

    const selectMenu = new SelectMenuBuilder()
      .setCustomId("styles.toggle")
      .setPlaceholder("Select a style to toggle")
      .addOptions(options);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // if (state.page > 1) {
    //   actionRow.addComponents(await ctx.manager.components.createInstance("styles.back", state));
    // }

    // if (unlockedStyles.length > state.page * STYLES_PER_PAGE) {
    //   actionRow.addComponents(await ctx.manager.components.createInstance("styles.next", state));
    // }

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private paginateStyles(styles: IUnlockedTreeStyle[], page: number): IUnlockedTreeStyle[] {
    const start = (page - 1) * STYLES_PER_PAGE;
    return styles.slice(start, start + STYLES_PER_PAGE);
  }

  private isStateValid(state: StylesButtonState | undefined): boolean {
    return state !== undefined && !isNaN(state.page) && state.page >= 0;
  }
}
