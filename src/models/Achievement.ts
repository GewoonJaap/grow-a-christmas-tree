import { model, Schema } from "mongoose";

interface IAchievement {
  userId: string;
  achievementName: string;
  description: string;
  dateEarned: Date;
  emoji: string;
}

const AchievementSchema = new Schema<IAchievement>({
  userId: { type: String, required: true, index: true },
  achievementName: { type: String, required: true },
  description: { type: String, required: true },
  dateEarned: { type: Date, required: true, default: Date.now },
  emoji: { type: String, required: true }
});

const Achievement = model<IAchievement>("Achievement", AchievementSchema);

export { Achievement, AchievementSchema, IAchievement };
