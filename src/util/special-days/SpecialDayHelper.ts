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
    return now.getMonth() === 10 && now.getDate() >= 22 && now.getDate() <= 28;
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

  public static shopPurchaseMultiplier(): number {
    if (this.isChristmas()) {
      return 1.25;
    }
    if (this.isNewYearsEve()) {
      return 1.25;
    }
    return 1;
  }
}
