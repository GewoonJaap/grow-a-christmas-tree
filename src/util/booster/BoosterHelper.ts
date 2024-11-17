import { IBooster, IGuild } from "../../models/Guild";

export class BoosterHelper {
  public static BOOSTERS = [
    {
      name: "Growth Booster",
      emoji: "🌱",
      effect: "Increases tree growth rate by 50%",
      cost: 150,
      duration: 3600, // 1 hour
      chance: 0.6, // 60% chance
      description: "🎄 Boost your tree's growth with a sprinkle of holiday magic!"
    },
    {
      name: "Watering Booster",
      emoji: "💧",
      effect: "Reduces watering cooldown by 50%",
      cost: 120,
      duration: 1800, // 30 minutes
      chance: 0.7, // 70% chance
      description: "💦 Keep your tree hydrated with this refreshing booster!"
    },
    {
      name: "Minigame Booster",
      emoji: "🎮",
      effect: "Increases minigame chances by 50%",
      cost: 200,
      duration: 5400, // 1.5 hours
      chance: 0.5, // 50% chance
      description: "🎮 Enjoy more festive fun with increased minigame chances!"
    },
    {
      name: "Coin Booster",
      emoji: "🪙",
      effect: "Increases coin earnings by 50%",
      cost: 180,
      duration: 7200, // 2 hours
      chance: 0.4, // 40% chance
      description: "🪙 Earn more coins to spend on festive goodies!"
    }
  ];

  static getActiveBoosters(game: IGuild): IBooster[] {
    const currentTime = Math.floor(Date.now() / 1000);
    return game.activeBoosters.filter((booster: IBooster) => booster.startTime + booster.duration > currentTime);
  }

  static shouldApplyBooster(game: IGuild, boosterName: string): boolean {
    const activeBoosters = this.getActiveBoosters(game);
    const booster = activeBoosters.find((b) => b.type === boosterName);
    if (booster) {
      const boosterData = this.BOOSTERS.find((b) => b.name === boosterName);
      if (boosterData) {
        return Math.random() < boosterData.chance;
      }
    }
    return false;
  }

  static addBooster(game: IGuild, boosterName: string): void {
    const booster = this.BOOSTERS.find((b) => b.name === boosterName);
    if (booster) {
      game.activeBoosters.push({
        type: booster.name,
        startTime: Math.floor(Date.now() / 1000),
        duration: booster.duration
      });
    }
  }
}