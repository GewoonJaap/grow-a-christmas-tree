import { getRandomElement } from "../helpers/arrayHelper";
import { SpecialDayHelper } from "../special-days/SpecialDayHelper";

export class NewsMessageHelper {
  private static messages: string[] = [
    "🎅 **Check out Santa's Wheel of Fortune!** Spin the wheel and win festive rewards! 🎁 Use **`/wheel`** to start spinning!",
    "🎄 **Don't miss out on the Advent Calendar!** Open a new present every day until Christmas! 🎁 Use **`/adventcalendar`** to open your present!",
    "🌱 **Upgrade Santa's Magic Composter to boost your tree's growth!** 🌟 Use **`/composter`** to view and upgrade!",
    "🛒 **Visit the Christmas Shop!** Browse and grab magical items to power up your tree! 🎁 Use **`/shop`** to start shopping!"
  ];

  private static christmasMessages: string[] = [
    "🎄 **Happy Holidays!** 🎅 Thank you for being part of our community! To celebrate, we're giving away extra coins, boosters, and tickets today! You will also enjoy 25% more on item purschages in the shop🎁",
    "🎅 **Merry Christmas!** 🎁 Thank you for being part of our community! To celebrate, we're giving away extra coins, boosters, and tickets today! You will also enjoy 25% more on item purschages in the shop🎁"
  ];

  private static newYearMessages: string[] = [
    "🎉 **Happy New Year!** 🎆 Thank you for being part of our community! To celebrate, we're giving away extra coins, boosters, and tickets today! 🎁"
  ];

  /**
   * Get news messages, including special day messages
   * @param maxMessages The maximum number of messages to return. Note it might contain more messages if there are special day messages
   * @param hardAmountCap If true, the amount of messages will be capped at maxMessages
   * @returns An array of messages
   */
  public static getMessages(maxMessages: number, hardAmountCap = false): string[] {
    const shuffledMessages = this.messages.sort(() => 0.5 - Math.random());
    const messages = shuffledMessages.slice(0, maxMessages);

    const specialDayMessages = this.getSpecialDayMessages();

    const specialDayMessage = specialDayMessages.length > 0 ? specialDayMessages[0] : null;
    if (specialDayMessage) {
      messages.push(specialDayMessage);
    }

    if (hardAmountCap && messages.length > maxMessages) {
      return messages.slice(0, maxMessages);
    }
    return messages;
  }

  private static getSpecialDayMessages(): string[] {
    const messages = [];
    if (SpecialDayHelper.isChristmas()) {
      messages.push(getRandomElement(this.christmasMessages) ?? this.christmasMessages[0]);
    }
    if (SpecialDayHelper.isNewYearsEve()) {
      messages.push(getRandomElement(this.newYearMessages) ?? this.newYearMessages[0]);
    }
    return messages;
  }
}
