import { model, Schema } from "mongoose";

interface IGuild {
  id: string;

  name: string;
  size: number;

  lastWateredBy: string;
  lastWateredAt: number;

  currentImageUrl?: string;
  hasAiAccess: boolean;
  superThirsty: boolean;

  lastEventAt: number;

  plantedAt: number;

  contributors: IContributor[];
}

interface IContributor {
  userId: string;
  count: number;
  lastWateredAt: number;
}

const ContributorSchema = new Schema<IContributor>({
  userId: { type: String, required: true },
  count: { type: Number, required: true, default: 1 },
  lastWateredAt: { type: Number, required: true, default: 0 }
});

const GuildSchema = new Schema<IGuild>({
  id: { type: String, required: true, unique: true },

  name: { type: String, required: true },
  size: { type: Number, required: true, default: 1 },

  currentImageUrl: { type: String, required: false },
  hasAiAccess: { type: Boolean, required: true, default: false },
  superThirsty: { type: Boolean, required: true, default: false },

  lastEventAt: { type: Number, required: true, default: Math.floor(Date.now() / 1000) },

  plantedAt: { type: Number, required: true, default: Math.floor(Date.now() / 1000) },

  lastWateredBy: { type: String, required: false },
  lastWateredAt: { type: Number, required: false },

  contributors: { type: [ContributorSchema], required: true, default: [] }
});

const Contributor = model<IContributor>("Contributor", ContributorSchema);
const Guild = model<IGuild>("Guild", GuildSchema);

export { Guild, GuildSchema, Contributor, ContributorSchema, IGuild, IContributor };
