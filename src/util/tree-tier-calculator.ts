export function calculateTreeTierImage(size: number): string {
  if (size < 10) return "https://i.imgur.com/pO8nLtb.png";
  if (size < 20) return "https://i.imgur.com/k3iDzAf.png";
  if (size < 30) return "https://i.imgur.com/DFy9c5e.png";
  if (size < 40) return "https://i.imgur.com/jaGpmD8.png";
  if (size < 50) return "https://i.imgur.com/0jkawPy.png";
  return "https://i.imgur.com/0jkawPy.png";
}
