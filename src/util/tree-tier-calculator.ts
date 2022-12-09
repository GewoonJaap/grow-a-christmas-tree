export function calculateTreeTierImage(size: number): string {
  if (size < 2) return "https://i.imgur.com/pO8nLtb.png";
  if (size < 5) return "https://i.imgur.com/qCU0ETK.png";
  if (size < 20) return "https://i.imgur.com/k3iDzAf.png";
  if (size < 30) return "https://i.imgur.com/DFy9c5e.png";
  if (size < 40) return "https://i.imgur.com/jaGpmD8.png";
  if (size < 50) return "https://i.imgur.com/0jkawPy.png";
  return "https://i.imgur.com/0jkawPy.png";
}
