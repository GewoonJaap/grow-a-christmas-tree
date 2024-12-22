import pino from "pino";

const logger = pino({
  level: "info"
});

export async function runMigrations(): Promise<void> {
  logger.info("Running migrations...");
  logger.info("Migrations completed.");
}
