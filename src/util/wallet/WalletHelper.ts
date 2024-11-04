import { Wallet } from "../../models/Wallet";

export class WalletHelper {
  static async getWallet(userId: string) {
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return await Wallet.create({ userId: userId, coins: 0 });
    }
    return wallet;
  }

  static async addCoins(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wallet = await WalletHelper.getWallet(userId);
    wallet.coins += amount;
    await wallet.save();
  }

  static async removeCoins(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wallet = await WalletHelper.getWallet(userId);
    wallet.coins -= Math.max(0, amount);
    await wallet.save();
  }
}
