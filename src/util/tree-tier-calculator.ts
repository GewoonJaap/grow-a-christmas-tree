import { ITreeStyle } from "../models/Guild";
import { ImageGenApi } from "./api/image-gen/ImageGenApi";
import { TreeStageConfig, TreeStages } from "./treeStages";

const AI_GEN_AFTER_TIER: TreeStageConfig = TreeStages[35];
const AI_GEN_TIER_WATERINGS_PER_LEVEL = 30;

export async function calculateTreeTierImage(
  size: number,
  useAiGen: boolean,
  guildId: string,
  treeStyles: ITreeStyle[],
  currentImageUri?: string
): Promise<TreeTier> {
  size = Math.floor(size);
  let level = getCurrentTreeTier(size, useAiGen);
  const enabledStyles = treeStyles.filter((style) => style.active);
  if (process.env.AI_ENABLED && useAiGen && size >= AI_GEN_AFTER_TIER.requiredTreeLength) {
    const imageGenApi = new ImageGenApi();

    // Check if the image is already generated
    const hasGeneratedImage = await imageGenApi.getHasGeneratedImage(guildId, level);

    if (hasGeneratedImage) {
      const image = await imageGenApi.getGeneratedImage(guildId, level, enabledStyles);
      if (image.data) {
        return { tier: level, image: image.data?.url, metadata: image.data?.metadata };
      }
    } else {
      imageGenApi.getGeneratedImage(guildId, level, enabledStyles);
      if (currentImageUri && (await isCurrentImageUriStillValid(currentImageUri))) {
        return { tier: level, image: currentImageUri, isLoadingNewImage: true };
      }
    }
  }
  level = getCurrentTreeTier(size, false); //fallback to normal tree tier
  return createTreeTierObject(level);
}

export async function isCurrentImageUriStillValid(imageUri: string): Promise<boolean> {
  try {
    const response = await fetch(imageUri, { method: "HEAD" });
    return response.ok && response.status === 200;
  } catch (error) {
    return false;
  }
}

export function getCurrentTreeTier(size: number, useAiGen: boolean): number {
  if (useAiGen && size >= AI_GEN_AFTER_TIER.requiredTreeLength) {
    return calculateAiGenTier(size);
  }
  const treeTier = TreeStages.find((treeStage) => treeStage.requiredTreeLength > size);
  if (!treeTier) return TreeStages[TreeStages.length - 1].tier;
  const tier = treeTier.tier - 1;
  if (tier < 0) return 0;
  return tier;
}

export interface TreeTier {
  tier: number;
  image: string;
  metadata?: Record<string, string>;
  isLoadingNewImage?: boolean;
}

function tierToImageName(tierNumber: number): string {
  return `${process.env.IMAGE_BASE_URI}stage-${tierNumber}.png`;
}

function createTreeTierObject(tierNumber: number): TreeTier {
  if (tierNumber < 0) tierNumber = 0;
  return { tier: tierNumber, image: tierToImageName(tierNumber) };
}

function calculateAiGenTier(size: number): number {
  return Math.floor((size - AI_GEN_AFTER_TIER.requiredTreeLength) / AI_GEN_TIER_WATERINGS_PER_LEVEL) + 36;
}
