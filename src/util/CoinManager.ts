import { Guild } from "../models/Guild";

export class CoinManager {
  static async addCoins(userId: string, amount: number): Promise<void> {
    const guild = await Guild.findOne({ "contributors.userId": userId });
    if (!guild) throw new Error("Guild not found.");

    const contributor = guild.contributors.find((contributor) => contributor.userId === userId);
    if (!contributor) throw new Error("Contributor not found.");

    contributor.wallet.coins += amount;
    await guild.save();
  }

  static async removeCoins(userId: string, amount: number): Promise<void> {
    const guild = await Guild.findOne({ "contributors.userId": userId });
    if (!guild) throw new Error("Guild not found.");

    const contributor = guild.contributors.find((contributor) => contributor.userId === userId);
    if (!contributor) throw new Error("Contributor not found.");

    contributor.wallet.coins = Math.max(0, contributor.wallet.coins - amount);
    await guild.save();
  }
}
