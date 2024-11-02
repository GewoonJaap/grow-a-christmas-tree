import { Button } from "interactions.ts";
import { PremiumButtonBuilder } from "../discord/DiscordApiExtensions";

export class PremiumButtons {
  static FestiveForestButtonName = "festiveforest.premium";
  static FestiveForestButton = new Button(
    PremiumButtons.FestiveForestButtonName,
    new PremiumButtonBuilder()
      .setEmoji({ name: "🛒" })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setStyle(6 as any)
      .setSkuId("1298016263687110697")
  );
}
