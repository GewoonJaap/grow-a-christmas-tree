import { TreeStages } from "./treeStages";

export function calculateTreeTierImage(size: number): TreeTier {
  const treeTier = TreeStages.find((treeStage) => treeStage.requiredTreeLength >= size + 1); // Stoopid hack to make it work. WIthout the +1 you always need 1 more water than you should.
  if (!treeTier) return createTreeTier(TreeStages[TreeStages.length - 1].tier);
  return createTreeTier(treeTier.tier - 1);
}

export interface TreeTier {
  tier: number;
  image: string;
}

function tierToImageName(tierNumber: number): string {
  return `${process.env.IMAGE_BASE_URI}stage-${tierNumber}.jpg`;
}

function createTreeTier(tierNumber: number): TreeTier {
  if (tierNumber < 0) tierNumber = 0;
  return { tier: tierNumber, image: tierToImageName(tierNumber) };
}
