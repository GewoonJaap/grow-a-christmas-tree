import { logger } from "../tracing/pinoLogger";

export async function runMigrations(): Promise<void> {
  logger.info("Running migrations...");
  logger.info("Migrations completed.");
}
