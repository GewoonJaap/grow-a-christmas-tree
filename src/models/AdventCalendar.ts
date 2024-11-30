import { model, Schema } from "mongoose";

interface IAdventCalendar {
  userId: string;
  claimDate: Date;
  presentType: string;
  daysClaimed: number;
  year: number;
}

const AdventCalendarSchema = new Schema<IAdventCalendar>({
  userId: { type: String, required: true, index: true },
  claimDate: { type: Date, required: true, default: Date.now },
  presentType: { type: String, required: true },
  daysClaimed: { type: Number, required: true, default: 0 },
  year: { type: Number, required: true, default: new Date().getFullYear() }
});

const AdventCalendar = model<IAdventCalendar>("AdventCalendar", AdventCalendarSchema);

export { AdventCalendar, AdventCalendarSchema, IAdventCalendar };
