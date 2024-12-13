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
import { randomUUID } from "crypto";

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
      new ButtonBuilder().setEmoji({ name: "✨" }).setStyle(1).setLabel("Toggle Styles"),
      async (ctx: ButtonContext<StylesButtonState>): Promise<void> => {
        return ctx.reply(await this.buildToggleStylesMessage(ctx));
      }
    )
  ];

  private async buildStylesMessage(
    ctx: SlashCommandContext | ButtonContext<StylesButtonState> | SelectMenuContext<StylesButtonState>
  ): Promise<MessageBuilder> {
    const state: StylesButtonState =
      ctx instanceof SlashCommandContext || !this.isStateValid(ctx.state)
        ? { page: 1 }
        : (ctx.state as StylesButtonState);

    if (!ctx.game) return new MessageBuilder().setContent("You don't have a tree planted yet!");

    const unlockedStyles = ctx.game.treeStyles;
    const paginatedStyles = this.paginateStyles(unlockedStyles, state.page);

    const embed = new EmbedBuilder()
      .setTitle("🎄 **Manage Tree Styles** 🎁")
      .setDescription(
        "Enable or disable your unlocked tree styles.\n" +
          paginatedStyles
            .map((style) => {
              return style.styleName + " - " + (style.active ? "Enabled" : "Disabled");
            })
            .join("\n")
      )
      .setFooter({ text: `Page ${state.page}/${Math.ceil(unlockedStyles.length / STYLES_PER_PAGE)}` });

    const actionRow = new ActionRowBuilder();

    if (state.page > 1) {
      actionRow.addComponents(await ctx.manager.components.createInstance("styles.back", state));
    }

    if (unlockedStyles.length > state.page * STYLES_PER_PAGE) {
      actionRow.addComponents(await ctx.manager.components.createInstance("styles.next", state));
    }

    actionRow.addComponents(await ctx.manager.components.createInstance("styles.toggle", state));

    return new MessageBuilder().addEmbed(embed).addComponents(actionRow);
  }

  private async buildToggleStylesMessage(ctx: ButtonContext<StylesButtonState>): Promise<MessageBuilder> {
    const state: StylesButtonState = ctx.state || { page: 1 };

    if (!ctx.game) return new MessageBuilder().setContent("You don't have a tree planted yet!");

    const unlockedStyles = ctx.game.treeStyles;
    const paginatedStyles = this.paginateStyles(unlockedStyles, state.page);

    const options = paginatedStyles.map((style) => {
      return new SelectMenuOptionBuilder()
        .setLabel(style.styleName)
        .setValue(style.styleName)
        .setDescription(style.active ? "Enabled" : "Disabled")
        .setDefault(style.active);
    });

    const name = "styles.toggle-" + randomUUID();

    const selectMenuBuilder = new SelectMenuBuilder()
      .setCustomId(name)
      .setPlaceholder("Select a style to toggle")
      .addOptions(options)
      .setMinValues(0)
      .setMaxValues(paginatedStyles.length);

    const menu = new SelectMenu(
      name,
      selectMenuBuilder,
      async (ctx: SelectMenuContext<StylesButtonState>): Promise<void> => {
        if (!ctx.state || !ctx.game) return;
        const selectedStyles = ctx.interaction.data.values;

        for (const style of ctx.game.treeStyles) {
          if (paginatedStyles.some((paginatedStyle) => paginatedStyle.styleName === style.styleName)) {
            style.active = selectedStyles.includes(style.styleName);
          }
        }

        await ctx.game.save();

        ctx.manager.components.unregister(name);

        return ctx.reply(await this.buildStylesMessage(ctx));
      }
    );

    ctx.manager.components.register([menu]);

    const selectMenu = await ctx.manager.components.createInstance(name, state);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    return new MessageBuilder().addComponents(actionRow);
  }

  private paginateStyles(styles: ITreeStyle[], page: number): ITreeStyle[] {
    const start = (page - 1) * STYLES_PER_PAGE;
    return styles.slice(start, start + STYLES_PER_PAGE);
  }

  private isStateValid(state: StylesButtonState | undefined): boolean {
    return state !== undefined && !isNaN(state.page) && state.page >= 0;
  }
}
