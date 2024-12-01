import { model, Schema } from "mongoose";

interface IAdventCalendar {
  userId: string;
  claimDates: Date[];
  year: number;
}

const AdventCalendarSchema = new Schema<IAdventCalendar>({
  userId: { type: String, required: true, index: true, unique: true },
  claimDates: { type: [Date], required: true, default: [] },
  year: { type: Number, required: true, default: new Date().getFullYear() }
});

const AdventCalendar = model<IAdventCalendar>("AdventCalendar", AdventCalendarSchema);

export { AdventCalendar, AdventCalendarSchema, IAdventCalendar };
