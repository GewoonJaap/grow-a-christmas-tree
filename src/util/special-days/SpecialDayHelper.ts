export class SpecialDayHelper {
  public static isChristmas(): boolean {
    const now = new Date();
    return (now.getMonth() === 11 && now.getDate() === 25) || (now.getMonth() === 11 && now.getDate() === 26);
  }

  public static isValentinesDay(): boolean {
    const now = new Date();
    return now.getMonth() === 1 && now.getDate() === 14;
  }

  public static isHalloween(): boolean {
    const now = new Date();
    return now.getMonth() === 9 && now.getDate() >= 24 && now.getDate() <= 31;
  }

  public static isThanksgiving(): boolean {
    const now = new Date();
    return now.getMonth() === 10 && now.getDate() >= 22 && now.getDate() <= 28 && now.getDay() === 4; // Fourth Thursday of November
  }

  public static isBlackFriday(): boolean {
    const now = new Date();
    return now.getMonth() === 10 && now.getDate() >= 23 && now.getDate() <= 29 && now.getDay() === 5; // Friday after Thanksgiving
  }

  public static isStPatricksDay(): boolean {
    const now = new Date();
    return now.getMonth() === 2 && now.getDate() === 17;
  }

  public static isEarthDay(): boolean {
    const now = new Date();
    return now.getMonth() === 3 && now.getDate() === 22;
  }

  public static isAprilFoolsDay(): boolean {
    const now = new Date();
    return now.getMonth() === 3 && now.getDate() === 1;
  }

  public static isNewYearsEve(): boolean {
    const now = new Date();
    return (now.getMonth() === 11 && now.getDate() === 31) || (now.getMonth() === 0 && now.getDate() === 1);
  }

  public static shopPurchaseMultiplier(): ShopPurchaseMultiplier {
    if (this.isChristmas()) {
      return {
        multiplier: 1.25,
        reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy **25%** more rewards and spread the festive cheer! 🎁✨"
      };
    }
    if (this.isNewYearsEve()) {
      return {
        multiplier: 1.25,
        reason:
          "🎉🥂 Happy New Year's Eve! Enjoy **25%** more rewards and ring in the new year with a festive boost! ✨"
      };
    }
    if (this.isValentinesDay()) {
      return {
        multiplier: 1.25,
        reason: "💖🌹 Happy Valentine's Day! Enjoy **25%** more rewards and spread the love! 💝✨"
      };
    }
    if (this.isThanksgiving()) {
      return {
        multiplier: 1.25,
        reason: "🦃🍂 Happy Thanksgiving! Enjoy **25%** more rewards and give thanks for all the blessings! 🍁✨"
      };
    }
    if (this.isBlackFriday()) {
      return {
        multiplier: 1.25,
        reason: "🛍️💸 It's Black Friday! Enjoy **25%** more rewards and grab the best deals! 🛒✨"
      };
    }
    return { multiplier: 1, reason: "" };
  }
}

export interface ShopPurchaseMultiplier {
  multiplier: number;
  reason?: string;
}
