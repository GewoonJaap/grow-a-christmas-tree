import { ButtonContext, SlashCommandContext } from "interactions.ts";
import { IBooster } from "../../models/Guild";
import { WalletHelper } from "../wallet/WalletHelper";

export type BoosterName = "Growth Booster" | "Watering Booster" | "Minigame Booster" | "Coin Booster";

export interface BoosterData {
  name: BoosterName;
  emoji: string;
  effect: string;
  cost: number;
  duration: number;
  chance: number;
  description: string;
  numberMultiplier?: number;
}

export class BoosterHelper {
  public static BOOSTERS: Record<BoosterName, BoosterData> = {
    "Growth Booster": {
      name: "Growth Booster",
      emoji: "🌱",
      effect: "Increases the base tree growth rate by 50%",
      cost: 150,
      duration: 3600, // 1 hour
      chance: 1,
      description: "🎄 Boost your tree's growth with a sprinkle of holiday magic!",
      numberMultiplier: 1.5
    },
    "Watering Booster": {
      name: "Watering Booster",
      emoji: "💧",
      effect: "Reduces watering cooldown by 50%",
      cost: 120,
      duration: 1800, // 30 minutes
      chance: 1,
      description: "💦 Keep your tree hydrated with this refreshing booster!",
      numberMultiplier: 0.5
    },
    "Minigame Booster": {
      name: "Minigame Booster",
      emoji: "🎮",
      effect: "Increases minigame chances by 50%",
      cost: 200,
      duration: 5400, // 1.5 hours
      chance: 0.5, // 50% chance
      description: "🎮 Enjoy more festive fun with increased minigame chances!"
    },
    "Coin Booster": {
      name: "Coin Booster",
      emoji: "🪙",
      effect: "Increases coin earnings by 50%",
      cost: 180,
      duration: 7200, // 2 hours
      chance: 1,
      description: "🪙 Earn more coins to spend on festive goodies!",
      numberMultiplier: 1.5
    }
  };

  static tryApplyBoosterEffectOnNumber(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    boosterName: BoosterName,
    number: number
  ): number {
    const booster = this.getBoosterByName(boosterName);
    if (this.shouldApplyBooster(ctx, boosterName)) {
      return number * (booster.numberMultiplier ?? 1);
    }
    return number;
  }

  static getBoosterByName(boosterName: BoosterName): BoosterData {
    return this.BOOSTERS[boosterName];
  }

  static getActiveBoosters(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>): IBooster[] {
    if (!ctx.game) return [];
    return ctx.game.activeBoosters.filter((booster: IBooster) => this.isBoosterActive(booster));
  }

  static shouldApplyBooster(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    boosterName: BoosterName
  ): boolean {
    const activeBoosters = this.getActiveBoosters(ctx);
    const booster = activeBoosters.find((b) => b.type === boosterName);
    if (booster && this.isBoosterActive(booster)) {
      const boosterData = this.BOOSTERS[boosterName];
      if (boosterData) {
        return Math.random() < boosterData.chance;
      }
    }
    return false;
  }

  static isBoosterActive(booster: IBooster): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return booster.startTime + booster.duration > currentTime;
  }

  static async addBooster(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    boosterName: BoosterName
  ): Promise<void> {
    if (!ctx.game) return;
    const booster = this.BOOSTERS[boosterName];
    if (booster) {
      const activeBooster = ctx.game.activeBoosters.find((b) => b.type === boosterName);
      const currentTime = Math.floor(Date.now() / 1000);
      if (activeBooster) {
        if (this.isBoosterActive(activeBooster)) {
          // Extend the duration if the booster is still active
          activeBooster.duration += booster.duration;
        } else {
          activeBooster.startTime = currentTime;
          activeBooster.duration = booster.duration;
        }
      } else {
        // Add a new booster or reset the startTime if the booster is not active
        ctx.game.activeBoosters.push({
          type: booster.name,
          startTime: currentTime,
          duration: booster.duration
        });
      }
      await ctx.game.save();
    }
  }

  static async purchaseBooster(
    ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
    boosterName: BoosterName
  ): Promise<boolean> {
    const booster = this.BOOSTERS[boosterName];
    if (!booster) return false;

    const wallet = await WalletHelper.getWallet(ctx.user.id);
    if (wallet.coins < booster.cost) {
      return false;
    }

    await WalletHelper.removeCoins(ctx.user.id, booster.cost);
    await this.addBooster(ctx, boosterName);
    return true;
  }
}
