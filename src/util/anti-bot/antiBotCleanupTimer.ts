import { WateringEvent } from "../../models/WateringEvent";
import { logger } from "../../tracing/pinoLogger";
import { cleanOldFailedAttempts } from "./failedAttemptsHelper";

const WATERING_EVENT_TTL = 2 * 24 * 60 * 60 * 1000; // 2 days

export function startAntiBotCleanupTimer() {
  cleanOldFailedAttempts();
  cleanOldWateringEvents();
  setInterval(async () => {
    await cleanOldFailedAttempts();
    await cleanOldWateringEvents();
  }, 1000 * 60 * 60 * 24);
}

async function cleanOldWateringEvents() {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - WATERING_EVENT_TTL);

  await WateringEvent.deleteMany({
    timestamp: { $lt: cutoffTime }
  });

  logger.info("Old watering events cleaned up.");
}
