const availableTreeStyles = [
  "Classic Tree",
  "Snowy Tree",
  "Candy Cane Tree",
  "Reindeer Tree",
  "Starry Night Tree",
  "Gingerbread Tree",
  "Ornament Tree",
  "Tinsel Tree",
  "Icicle Tree",
  "Nutcracker Tree"
];

export function getRandomTreeStyle(unlockedTreeStyles: string[]): string | null {
  const lockedTreeStyles = availableTreeStyles.filter((style) => !unlockedTreeStyles.includes(style));
  if (lockedTreeStyles.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * lockedTreeStyles.length);
  return lockedTreeStyles[randomIndex];
}
