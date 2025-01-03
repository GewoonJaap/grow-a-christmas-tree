import { model, Schema } from "mongoose";

interface IFailedAttempt {
  userId: string;
  guildId: string;
  attemptType: string;
  failureReason: string;
  timestamp: Date;
}

const FailedAttemptSchema = new Schema<IFailedAttempt>({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  attemptType: { type: String, required: true },
  failureReason: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true, expires: "2d" }
});

const FailedAttempt = model<IFailedAttempt>("FailedAttempt", FailedAttemptSchema);

export { FailedAttempt, FailedAttemptSchema, IFailedAttempt };
