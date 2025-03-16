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

  public static isEaster(): boolean {
    const today = new Date();
    const easterDate = this.calculateEasterDate(today.getFullYear());

    // Check if today is Easter Sunday
    return today.getMonth() === easterDate.getMonth() && today.getDate() === easterDate.getDate();
  }

  /**
   * Calculate Easter Sunday date for a given year using Meeus/Jones/Butcher algorithm
   * @param year The year to calculate Easter for
   * @returns Date object representing Easter Sunday
   */
  private static calculateEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based month
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  public static getSpecialDayMultipliers(): SpecialDayMultipliers {
    if (this.isChristmas()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 0.75,
            reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy a **25%** sale on boosters! 🎁✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy **25%** more rewards and spread the festive cheer! 🎁✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy **25%** more coins on your purchases! 🎁✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy **100%** more tickets and spread the festive cheer! 🎁✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🎅🎄 Ho-Ho-Ho! It's Christmas! Enjoy **50%** more coins and spread the festive cheer! 🎁✨"
        },
        isActive: true,
        generalMessage: "🎄 Merry Christmas! Enjoy double rewards today! 🎄"
      };
    }
    if (this.isNewYearsEve()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 1,
            reason:
              "🎉🥂 Happy New Year's Eve! Enjoy **25%** more rewards and ring in the new year with a festive boost! ✨"
          },
          styles: {
            priceMultiplier: 1,
            reason:
              "🎉🥂 Happy New Year's Eve! Enjoy **25%** more rewards and ring in the new year with a festive boost! ✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🎉🥂 Happy New Year's Eve! Enjoy **25%** more coins on your purchases! ✨"
        },
        tickets: {
          multiplier: 2,
          reason:
            "🎉🥂 Happy New Year's Eve! Enjoy **100%** more tickets and ring in the new year with a festive boost! ✨"
        },
        coins: {
          multiplier: 1.5,
          reason:
            "🎉🥂 Happy New Year's Eve! Enjoy **50%** more coins and ring in the new year with a festive boost! ✨"
        },
        isActive: true,
        generalMessage: "🎉 Happy New Year's Eve! Enjoy double rewards today! 🎉"
      };
    }
    if (this.isValentinesDay()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 0.75,
            reason: "💖🌹 Happy Valentine's Day! Enjoy a **25%** sale on boosters! 💝✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "💖🌹 Happy Valentine's Day! Enjoy **25%** more rewards and spread the love! 💝✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "💖🌹 Happy Valentine's Day! Enjoy **25%** more coins on your purchases! 💝✨"
        },
        tickets: {
          multiplier: 2,
          reason: "💖🌹 Happy Valentine's Day! Enjoy **100%** more tickets and spread the love! 💝✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "💖🌹 Happy Valentine's Day! Enjoy **50%** more coins and spread the love! 💝✨"
        },
        isActive: true,
        generalMessage: "💖 Happy Valentine's Day! Enjoy double rewards today! 💖"
      };
    }
    if (this.isStPatricksDay()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 0.75,
            reason: "🍀🌈 Happy St. Patrick's Day! Enjoy a **25%** sale on boosters! 🍺✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🍀🌈 Happy St. Patrick's Day! Enjoy **25%** more rewards and spread the luck of the Irish! 🍺✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🍀🌈 Happy St. Patrick's Day! Enjoy **25%** more coins on your purchases! 🍺✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🍀🌈 Happy St. Patrick's Day! Enjoy **100%** more tickets and spread the luck of the Irish! 🍺✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🍀🌈 Happy St. Patrick's Day! Enjoy **50%** more coins and spread the luck of the Irish! 🍺✨"
        },
        isActive: true,
        generalMessage: "🍀 Happy St. Patrick's Day! Enjoy double rewards today! 🍀"
      };
    }
    if (this.isEaster()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 0.75,
            reason: "🐰🥚 Happy Easter! Enjoy a **25%** sale on boosters! 🌷✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🐰🥚 Happy Easter! Enjoy **25%** more rewards and spread the Easter cheer! 🌷✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🐰🥚 Happy Easter! Enjoy **25%** more coins on your purchases! 🌷✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🐰🥚 Happy Easter! Enjoy **100%** more tickets and spread the Easter cheer! 🌷✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🐰🥚 Happy Easter! Enjoy **50%** more coins and spread the Easter cheer! 🌷✨"
        },
        isActive: true,
        generalMessage: "🐰 Happy Easter! Enjoy double rewards today! 🐰"
      };
    }
    if (this.isAprilFoolsDay()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 0.75,
            reason: "🤡🎉 Happy April Fool's Day! Enjoy a **25%** sale on boosters! 🎈✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🤡🎉 Happy April Fool's Day! Enjoy **25%** more rewards and spread the fun! 🎈✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🤡🎉 Happy April Fool's Day! Enjoy **25%** more coins on your purchases! 🎈✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🤡🎉 Happy April Fool's Day! Enjoy **100%** more tickets and spread the fun! 🎈✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🤡🎉 Happy April Fool's Day! Enjoy **50%** more coins and spread the fun! 🎈✨"
        },
        isActive: true,
        generalMessage: "🤡 Happy April Fool's Day! Enjoy double rewards today! 🤡"
      };
    }
    if (this.isThanksgiving()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 1,
            reason: "🦃🍂 Happy Thanksgiving! Enjoy **25%** more rewards and give thanks for all the blessings! 🍁✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🦃🍂 Happy Thanksgiving! Enjoy **25%** more rewards and give thanks for all the blessings! 🍁✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🦃🍂 Happy Thanksgiving! Enjoy **25%** more coins on your purchases! 🍁✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🦃🍂 Happy Thanksgiving! Enjoy **100%** more tickets and give thanks for all the blessings! 🍁✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🦃🍂 Happy Thanksgiving! Enjoy **50%** more coins and give thanks for all the blessings! 🍁✨"
        },
        isActive: true,
        generalMessage: "🦃 Happy Thanksgiving! Enjoy double rewards today! 🦃"
      };
    }
    if (this.isBlackFriday()) {
      return {
        inGameShop: {
          boosters: {
            priceMultiplier: 1,
            reason: "🛍️💸 It's Black Friday! Enjoy **25%** more rewards and grab the best deals! 🛒✨"
          },
          styles: {
            priceMultiplier: 1,
            reason: "🛍️💸 It's Black Friday! Enjoy **25%** more rewards and grab the best deals! 🛒✨"
          }
        },
        realMoneyShop: {
          multiplier: 1.25,
          reason: "🛍️💸 It's Black Friday! Enjoy **25%** more coins on your purchases! 🛒✨"
        },
        tickets: {
          multiplier: 2,
          reason: "🛍️💸 It's Black Friday! Enjoy **100%** more tickets and grab the best deals! 🛒✨"
        },
        coins: {
          multiplier: 1.5,
          reason: "🛍️💸 It's Black Friday! Enjoy **50%** more coins and grab the best deals! 🛒✨"
        },
        isActive: true,
        generalMessage: "🛍️ It's Black Friday! Enjoy double rewards today! 🛍️"
      };
    }
    return {
      inGameShop: {
        boosters: { priceMultiplier: 1, reason: "" },
        styles: { priceMultiplier: 1, reason: "" }
      },
      realMoneyShop: { multiplier: 1, reason: "" },
      tickets: { multiplier: 1, reason: "" },
      coins: { multiplier: 1, reason: "" },
      isActive: false,
      generalMessage: ""
    };
  }

  public static getFestiveMessage(): { message: string; isPresent: boolean } {
    if (this.isChristmas()) {
      return { message: "🎄 Merry Christmas! Enjoy the festive season! 🎄", isPresent: true };
    }
    if (this.isNewYearsEve()) {
      return { message: "🎉 Happy New Year's Eve! Enjoy the celebrations! 🎉", isPresent: true };
    }
    if (this.isValentinesDay()) {
      return { message: "💖 Happy Valentine's Day! Spread the love! 💖", isPresent: true };
    }
    if (this.isThanksgiving()) {
      return { message: "🦃 Happy Thanksgiving! Give thanks and enjoy! 🦃", isPresent: true };
    }
    if (this.isBlackFriday()) {
      return { message: "🛍️ Happy Black Friday! Enjoy the deals! 🛍️", isPresent: true };
    }
    return { message: "", isPresent: false };
  }
}

export interface SpecialDayMultipliers {
  inGameShop: {
    boosters: {
      priceMultiplier: number;
      reason: string;
    };
    styles: {
      priceMultiplier: number;
      reason: string;
    };
  };
  realMoneyShop: {
    multiplier: number;
    reason: string;
  };
  tickets: {
    multiplier: number;
    reason: string;
  };
  coins: {
    multiplier: number;
    reason: string;
  };
  isActive: boolean;
  generalMessage: string;
}
