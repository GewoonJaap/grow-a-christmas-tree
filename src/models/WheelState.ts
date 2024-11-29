import { model, Schema } from "mongoose";

interface IWheelState {
  userId: string;
  tickets: number;
  lastSpinDate: Date;
}

const WheelStateSchema = new Schema<IWheelState>({
  userId: { type: String, required: true, unique: true, index: true },
  tickets: { type: Number, required: true, default: 0 },
  lastSpinDate: { type: Date, required: true, default: new Date("1999-01-01T00:00:00Z") }
});

const WheelState = model<IWheelState>("WheelState", WheelStateSchema);

export { WheelState, WheelStateSchema, IWheelState };
