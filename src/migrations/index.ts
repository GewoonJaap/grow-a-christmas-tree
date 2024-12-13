import { migrateUnlockedTreeStyles } from "./migrateUnlockedTreeStyles";

export async function runMigrations(): Promise<void> {
  console.log("Running migrations...");
  await migrateUnlockedTreeStyles();
  console.log("Migrations completed.");
}
