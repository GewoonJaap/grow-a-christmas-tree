export function calculateTreeTierImage(size: number): TreeTier {
  if (size < 2) return { tier: 1, image: tierToImageName(1) };
  if (size < 5) return { tier: 2, image: tierToImageName(2) };
  if (size < 20) return { tier: 3, image: tierToImageName(3) };
  if (size < 35) return { tier: 4, image: tierToImageName(4) };
  if (size < 55) return { tier: 5, image: tierToImageName(5) };
  if (size < 80) return { tier: 6, image: tierToImageName(6) };
  if (size < 110) return { tier: 7, image: tierToImageName(7) };
  if (size < 145) return { tier: 8, image: tierToImageName(8) };
  if (size < 185) return { tier: 9, image: tierToImageName(9) };
  if (size < 230) return { tier: 10, image: tierToImageName(10) };
  if (size < 280) return { tier: 11, image: tierToImageName(11) };
  if (size < 335) return { tier: 12, image: tierToImageName(12) };
  if (size < 395) return { tier: 13, image: tierToImageName(13) };
  if (size < 455) return { tier: 14, image: tierToImageName(14) };
  if (size < 520) return { tier: 15, image: tierToImageName(15) };
  if (size < 590) return { tier: 16, image: tierToImageName(16) };
  if (size < 665) return { tier: 17, image: tierToImageName(17) };
  if (size < 745) return { tier: 18, image: tierToImageName(18) };
  if (size < 830) return { tier: 19, image: tierToImageName(19) };
  if (size < 920) return { tier: 20, image: tierToImageName(20) };
  if (size < 1015) return { tier: 21, image: tierToImageName(21) };
  if (size < 1120) return { tier: 22, image: tierToImageName(22) };
  if (size < 1225) return { tier: 23, image: tierToImageName(23) };
  if (size < 1340) return { tier: 24, image: tierToImageName(24) };
  if (size < 1465) return { tier: 25, image: tierToImageName(25) };
  if (size < 1600) return { tier: 26, image: tierToImageName(26) };
  if (size < 1745) return { tier: 27, image: tierToImageName(27) };
  if (size < 1900) return { tier: 28, image: tierToImageName(28) };
  return { tier: 28, image: tierToImageName(28) };
}

export interface TreeTier {
  tier: number;
  image: string;
}

function tierToImageName(tierNumber: number): string {
  return `${process.env.IMAGE_BASE_URI}level-${tierNumber}.jpg`;
}
