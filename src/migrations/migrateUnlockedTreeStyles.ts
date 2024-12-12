import { Guild, IGuild } from "../models/Guild";

export async function migrateUnlockedTreeStyles(): Promise<void> {
  const guilds = await Guild.find({ id: "306126255604891648" });
  console.log(`Migrating ${guilds.length} guilds...`);

  for (const guild of guilds) {
    console.log(
      `Migrating guild ${guild.id}...`,
      Array.isArray(guild.unlockedTreeStyles),
      typeof guild.unlockedTreeStyles[0]
    );
    if (Array.isArray(guild.unlockedTreeStyles) && typeof guild.unlockedTreeStyles[0] === "string") {
      const updatedStyles = guild.unlockedTreeStyles.map((styleName) => ({
        styleName,
        active: false
      }));

      guild.unlockedTreeStyles = updatedStyles as unknown as IGuild["unlockedTreeStyles"];
      console.log(updatedStyles);
      await guild.save();
    }
  }

  console.log("Migration completed.");
}
