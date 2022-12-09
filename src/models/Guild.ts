import { model, Schema } from "mongoose";

interface ITree {
  id: string;

  name: string;

  size: number;
  pieces: number[];

  background: string;
  backgroundStyle: string;

  lastWateredBy: string;
  lastWateredAt: number;

  contributors: IContributor[];
}

interface IContributor {
  userId: string;
  count: number;
}

const ContributorSchema = new Schema<IContributor>({
  userId: { type: String, required: true },
  count: { type: Number, required: true, default: 1 }
});

const GuildSchema = new Schema<ITree>({
  id: { type: String, required: true, unique: true },

  name: { type: String, required: true },

  background: { type: String, required: true, default: "Ground" },
  backgroundStyle: { type: String, required: true, default: "Base" },

  size: { type: Number, required: true },
  pieces: { type: [Number], required: true },

  lastWateredBy: { type: String, required: false },
  lastWateredAt: { type: Number, required: false },

  contributors: { type: [ContributorSchema], required: true, default: [] }
});

const Contributor = model<IContributor>("Contributor", ContributorSchema);
const Guild = model<ITree>("Guild", GuildSchema);

export { Guild, GuildSchema, Contributor, ContributorSchema, ITree, IContributor };
