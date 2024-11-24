import { WateringEvent } from "../../models/WateringEvent";

export const WATERING_EVENT_TIMEFRAME = 1000 * 60 * 60 * 24; // 24 hours
export const EXCESSIVE_WATERING_THRESHOLD = 16; // Threshold for excessive watering events in a day

export async function countWateringEvents(userId: string, guildId: string): Promise<number> {
  const now = new Date();
  const startTime = new Date(now.getTime() - WATERING_EVENT_TIMEFRAME);

  const wateringEvents = await WateringEvent.countDocuments({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  return wateringEvents;
}

export async function countExcessiveWateringEvents(userId: string, guildId: string): Promise<number> {
  const now = new Date();
  const startTime = new Date(now.getTime() - WATERING_EVENT_TIMEFRAME);

  const wateringEvents = await WateringEvent.find({
    userId,
    guildId,
    timestamp: { $gte: startTime, $lte: now }
  });

  const hours = new Set<number>();

  wateringEvents.forEach((event) => {
    const eventHour = event.timestamp.getUTCHours();
    hours.add(eventHour);
  });

  return hours.size;
}
