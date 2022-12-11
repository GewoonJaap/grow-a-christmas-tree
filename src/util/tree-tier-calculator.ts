export function calculateTreeTierImage(size: number): string {
  if (size < 2) return "https://i.imgur.com/pO8nLtb.png";
  if (size < 5) return "https://i.imgur.com/qCU0ETK.png";
  if (size < 20) return "https://i.imgur.com/k3iDzAf.png";
  if (size < 35) return "https://i.imgur.com/DFy9c5e.png";
  if (size < 55) return "https://i.imgur.com/jaGpmD8.png";
  if (size < 80) return "https://i.imgur.com/0jkawPy.png";
  if (size < 110) return "https://i.imgur.com/NBK1biD.jpg";
  if (size < 145) return "https://i.imgur.com/o3DYowJ.jpg";
  if (size < 165) return "https://i.imgur.com/Y2P6t8G.jpg";
  if (size < 185) return "https://i.imgur.com/nJn7BZY.jpg";
  if (size < 205) return "https://i.imgur.com/8oTigep.jpg";
  if (size < 225) return "https://i.imgur.com/j0sOYGV.jpg";
  if (size < 235) return "https://i.imgur.com/pBAhFIX.jpg";
  if (size < 255) return "https://i.imgur.com/cOWaOLA.jpg";
  if (size < 295) return "https://i.imgur.com/nw8PZXM.jpg";
  return "https://i.imgur.com/nw8PZXM.jpg";
}
