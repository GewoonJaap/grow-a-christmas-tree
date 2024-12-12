import { Guild, ITreeStyle } from "../models/Guild";

export async function migrateUnlockedTreeStyles(): Promise<void> {
  const guilds = await Guild.find({ id: "306126255604891648" });
  console.log(`Migrating ${guilds.length} guilds...`);

  for (const guild of guilds) {
    console.log(`Migrating guild ${guild.id}...`, Array.isArray(guild.unlockedTreeStyles));
    if (Array.isArray(guild.unlockedTreeStyles) && typeof guild.unlockedTreeStyles[0] === "string") {
      const updatedStyles = [];
      for (const style of guild.unlockedTreeStyles) {
        updatedStyles.push({
          styleName: style,
          active: true
        });
      }

      guild.treeStyles = updatedStyles as unknown as ITreeStyle[];
      console.log(updatedStyles);
      delete guild.unlockedTreeStyles;
      await guild.save();
    }
  }

  console.log("Migration completed.");
}
