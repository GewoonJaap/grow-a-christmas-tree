import { TreeStageConfig, TreeStages } from "./treeStages";
import { ImageGenApi } from "./image-gen/ImageGenApi";

const AI_GEN_AFTER_TIER: TreeStageConfig = TreeStages[35];

export async function calculateTreeTierImage(size: number, useAiGen: boolean, guildId: string): Promise<TreeTier> {
  const level = getCurrentTreeTier(size, useAiGen);
  if (useAiGen && size >= AI_GEN_AFTER_TIER.requiredTreeLength) {
    const imageGenApi = new ImageGenApi();
    const imageResponse = await imageGenApi.getGeneratedImage(guildId, level);
    if (imageResponse != null && imageResponse.success && imageResponse.data != null) {
      return { tier: level, image: imageResponse.data.url };
    }
  }
  return createTreeTierObject(level);
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
