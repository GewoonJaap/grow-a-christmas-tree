import { model, Schema } from "mongoose";

interface IWateringEvent {
  userId: string;
  guildId: string;
  timestamp: Date;
}

const WateringEventSchema = new Schema<IWateringEvent>({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true, expires: "2d" }
});

const WateringEvent = model<IWateringEvent>("WateringEvent", WateringEventSchema);

export { WateringEvent, WateringEventSchema, IWateringEvent };
