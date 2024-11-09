import { IWallet, Wallet } from "../../models/Wallet";
const MAX_COINS = 1000000;

export class WalletHelper {
  static async getWallet(userId: string): Promise<InstanceType<typeof Wallet>> {
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      return await Wallet.create(WalletHelper.getDefaultWallet(userId));
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
    const newWallets = await Wallet.insertMany(missingUserIds.map((userId) => WalletHelper.getDefaultWallet(userId)));

    newWallets.forEach((wallet) => {
      walletMap.set(wallet.userId, wallet);
    });

    return walletMap;
  }

  static getDefaultWallet(userId: string): IWallet {
    return { coins: 0, userId: userId, streak: 0, lastClaimDate: new Date("1999-01-01T00:00:00Z") };
  }

  static async addCoins(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wallet = await WalletHelper.getWallet(userId);
    wallet.coins += amount;
    wallet.coins = Math.min(wallet.coins, MAX_COINS);
    wallet.coins = Math.max(wallet.coins, 0);
    await wallet.save();
  }

  static async removeCoins(userId: string, amount: number) {
    if (amount < 0) {
      amount *= -1;
    }
    const wallet = await WalletHelper.getWallet(userId);
    wallet.coins -= Math.max(0, amount);
    wallet.coins = Math.min(wallet.coins, MAX_COINS);
    wallet.coins = Math.max(wallet.coins, 0);
    await wallet.save();
  }

  static async updateStreak(userId: string, streak: number, lastClaimDate: Date) {
    const wallet = await WalletHelper.getWallet(userId);
    wallet.streak = streak;
    wallet.lastClaimDate = lastClaimDate;
    await wallet.save();
  }
}
