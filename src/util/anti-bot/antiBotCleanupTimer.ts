import { cleanOldFailedAttempts } from "./antiBotHelper";
import { WateringEvent } from "../../models/WateringEvent";
import { connect } from "mongoose";

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
  const cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

  await WateringEvent.deleteMany({
    timestamp: { $lt: cutoffTime }
  });

  console.log("Old watering events cleaned up.");
}
