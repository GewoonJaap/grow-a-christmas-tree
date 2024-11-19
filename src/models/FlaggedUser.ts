import { model, Schema } from "mongoose";

interface IFlaggedUser {
  userId: string;
  guildId: string;
  reason: string;
  timestamp: Date;
}

const FlaggedUserSchema = new Schema<IFlaggedUser>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now }
});

const FlaggedUser = model<IFlaggedUser>("FlaggedUser", FlaggedUserSchema);

export { FlaggedUser, FlaggedUserSchema, IFlaggedUser };
