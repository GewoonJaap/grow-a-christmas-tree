import { Wallet } from "../../models/Wallet";

export class WalletHelper {
  static async getWallet(userId: string): Promise<InstanceType<typeof Wallet>> {
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return await Wallet.create({ userId: userId, coins: 0, streak: 0 });
    }
    return wallet;
  }

  static async getWallets(userIds: string[]): Promise<Map<string, InstanceType<typeof Wallet>>> {
    const wallets = await Wallet.find({ userId: { $in: userIds } });
    const walletMap = new Map<string, InstanceType<typeof Wallet>>();

    // Add existing wallets to the map
    wallets.forEach((wallet) => {
      walletMap.set(wallet.userId, wallet);
    });

    // Create missing wallets and add them to the map
    const missingUserIds = userIds.filter((userId) => !walletMap.has(userId));
    const newWallets = await Wallet.insertMany(missingUserIds.map((userId) => ({ userId: userId, coins: 0, streak: 0 })));

    newWallets.forEach((wallet) => {
      walletMap.set(wallet.userId, wallet);
    });

    return walletMap;
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

  static async updateStreak(userId: string, streak: number, lastClaimDate: Date) {
    const wallet = await WalletHelper.getWallet(userId);
    wallet.streak = streak;
    wallet.lastClaimDate = lastClaimDate;
    await wallet.save();
  }
}
