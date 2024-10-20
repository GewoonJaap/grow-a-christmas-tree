import { TreeStageConfig, TreeStages } from "./treeStages";
import { ImageGenApi } from "./image-gen/ImageGenApi";

const AI_GEN_AFTER_TIER: TreeStageConfig = TreeStages[35];

export async function calculateTreeTierImage(
  size: number,
  useAiGen: boolean,
  guildId: string,
  currentImageUri?: string
): Promise<TreeTier> {
  const level = getCurrentTreeTier(size, useAiGen);
  if (useAiGen && size >= AI_GEN_AFTER_TIER.requiredTreeLength) {
    const imageGenApi = new ImageGenApi();

    // Check if the image is already generated
    const hasGeneratedImage = await imageGenApi.getHasGeneratedImage(guildId, level);

    if (hasGeneratedImage) {
      const image = await imageGenApi.getGeneratedImage(guildId, level);
      if (image.data) {
        return { tier: level, image: image.data?.url };
      }
    } else {
      imageGenApi.getGeneratedImage(guildId, level);
      if (currentImageUri && (await isCurrentImageUriStillValid(currentImageUri))) {
        return { tier: level, image: currentImageUri };
      }
    }
  }
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
}

function tierToImageName(tierNumber: number): string {
  return `${process.env.IMAGE_BASE_URI}stage-${tierNumber}.png`;
}

function createTreeTierObject(tierNumber: number): TreeTier {
  if (tierNumber < 0) tierNumber = 0;
  return { tier: tierNumber, image: tierToImageName(tierNumber) };
}

function calculateAiGenTier(size: number): number {
  return Math.floor((size - AI_GEN_AFTER_TIER.requiredTreeLength) / 100) + 36;
}
