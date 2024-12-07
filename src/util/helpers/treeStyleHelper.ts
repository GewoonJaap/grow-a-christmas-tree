import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { ImageStylesApi } from "../api/image-styles/ImageStyleApi";
import { ImageStyle } from "../types/api/ImageStylesApi/ImageStylesReponseType";

const imageStyleApi = new ImageStylesApi();

export async function getRandomLockedTreeStyle(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>
): Promise<ImageStyle | null> {
  const unlockedTreeStyles = ctx.game?.unlockedTreeStyles ?? [];
  const apiResponse = await imageStyleApi.getImageStyles();
  if (!apiResponse.success) {
    return null;
  }
  const lockedTreeStyles = apiResponse.styles.filter((style) => !unlockedTreeStyles.includes(style.name));
  if (lockedTreeStyles.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * lockedTreeStyles.length);
  return lockedTreeStyles[randomIndex];
}
