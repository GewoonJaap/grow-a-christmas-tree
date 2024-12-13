import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { ImageStylesApi } from "../api/image-styles/ImageStyleApi";
import { ImageStyle } from "../types/api/ImageStylesApi/ImageStylesResponseType";
import { ITreeStyle } from "../../models/Guild";

const imageStyleApi = new ImageStylesApi();

export class TreeStyleHelper {
  static async getRandomLockedTreeStyle(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>
  ): Promise<ImageStyle | null> {
    if (!ctx.game) return null;
    const unlockedTreeStyles = ctx.game.treeStyles ?? [];
    const apiResponse = await imageStyleApi.getImageStyles();
    if (!apiResponse.success) {
      return null;
    }
    const lockedTreeStyles = apiResponse.styles.filter(
      (style) => !unlockedTreeStyles.some((unlockedStyle: ITreeStyle) => unlockedStyle.styleName === style.name)
    );
    if (lockedTreeStyles.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * lockedTreeStyles.length);
    return lockedTreeStyles[randomIndex];
  }

  static async addNewStyle(
    ctx: SlashCommandContext | ButtonContext<unknown> | ButtonContext,
    styleName: string
  ): Promise<void> {
    if (!ctx.game) return;

    if (!ctx.game.treeStyles.some((style) => style.styleName === styleName)) {
      ctx.game.treeStyles.push({ styleName, active: true });
      await ctx.game.save();
    }
  }

  static async setStyleStatus(
    ctx: SlashCommandContext | ButtonContext<unknown> | ButtonContext,
    styleName: string,
    activationStatus: boolean
  ): Promise<void> {
    if (!ctx.game) return;

    const style = ctx.game.treeStyles.find((s) => s.styleName === styleName);
    if (!style) return;

    style.active = activationStatus;
    await ctx.game.save();
  }

  static hasStyleUnlocked(
    ctx: SlashCommandContext | ButtonContext<unknown> | ButtonContext,
    styleName: string
  ): boolean {
    if (!ctx.game) return false;

    return ctx.game.treeStyles.some((style) => style.styleName === styleName);
  }
}
