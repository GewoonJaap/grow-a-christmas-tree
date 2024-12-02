export class NewsMessageHelper {
  private static messages: string[] = [
    "🎅 **Check out Santa's Wheel of Fortune!** Spin the wheel and win festive rewards! 🎁 Use **`/wheel`** to start spinning!",
    "🎄 **Don't miss out on the Advent Calendar!** Open a new present every day until Christmas! 🎁 Use **`/adventcalendar`** to open your present!",
    "🌱 **Upgrade Santa's Magic Composter to boost your tree's growth!** 🌟 Use **`/composter`** to view and upgrade!",
    "🛒 **Visit the Christmas Shop!** Browse and grab magical items to power up your tree! 🎁 Use **`/shop`** to start shopping!"
  ];

  public static getMessages(maxMessages: number): string[] {
    const shuffledMessages = this.messages.sort(() => 0.5 - Math.random());
    return shuffledMessages.slice(0, maxMessages);
  }
}
