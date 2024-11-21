import { model, Schema } from "mongoose";

interface IBannedUser {
  userId: string;
  reason: string;
  timeStart: Date;
  timeEnd?: Date | null; // Allow timeEnd to be null for permanent bans
}

const BannedUserSchema = new Schema<IBannedUser>({
  userId: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  timeStart: { type: Date, required: true, default: Date.now },
  timeEnd: { type: Date, default: null }
});

const BannedUser = model<IBannedUser>("BannedUser", BannedUserSchema);

export { BannedUser, BannedUserSchema, IBannedUser };
