import {
  ActionRowBuilder,
  Button,
  ButtonBuilder,
  ButtonContext,
  EmbedBuilder,
  ISlashCommand,
  MessageBuilder,
  SelectMenu,
  SelectMenuBuilder,
  SelectMenuContext,
  SelectMenuOptionBuilder,
  SlashCommandBuilder,
  SlashCommandContext
} from "interactions.ts";
import { Guild, ITreeStyle } from "../models/Guild";

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
    new SelectMenu(
      "styles.toggle",
      new SelectMenuBuilder().setCustomId("styles.toggle"),
      async (ctx: SelectMenuContext<StylesButtonState>): Promise<void> => {
        if (!ctx.state) return;
        console.log(ctx.interaction.data.values);
        const styleName = ctx.interaction.data.values[0];
        if (!ctx.game) return;

        const style = ctx.game.treeStyles.find((s) => s.styleName === styleName);
        if (!style) return;

        style.active = !style.active;
        await ctx.game.save();

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

    if (!ctx.game) return new MessageBuilder().setContent("You don't have a tree planted yet!");

    const unlockedStyles = ctx.game.treeStyles;
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
        .setDescription(style.active ? "Enabled" : "Disabled");
    });

    const selectMenu = new SelectMenuBuilder()
      .setCustomId("styles.toggle")
      .setPlaceholder("Select a style to toggle")
      .addOptions(options)
      .setMinValues(0)
      .setMaxValues(paginatedStyles.length);

    new SelectMen();

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // if (state.page > 1) {
    //   actionRow.addComponents(await ctx.manager.components.createInstance("styles.back", state));
    // }

    // if (unlockedStyles.length > state.page * STYLES_PER_PAGE) {
    //   actionRow.addComponents(await ctx.manager.components.createInstance("styles.next", state));
    // }

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private paginateStyles(styles: ITreeStyle[], page: number): ITreeStyle[] {
    const start = (page - 1) * STYLES_PER_PAGE;
    return styles.slice(start, start + STYLES_PER_PAGE);
  }

  private isStateValid(state: StylesButtonState | undefined): boolean {
    return state !== undefined && !isNaN(state.page) && state.page >= 0;
  }
}
