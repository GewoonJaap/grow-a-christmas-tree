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
  isCheating: boolean;

  lastEventAt: number;

  plantedAt: number;

  contributors: IContributor[];

  notificationRoleId?: string;
  webhookId?: string;
  webhookToken?: string;

  timeZone: string;

  composter: {
    efficiencyLevel: number;
    qualityLevel: number;
  };

  activeBoosters: IBooster[];

  unlockedTreeStyles?: string[];
  treeStyles: ITreeStyle[];
}

interface IContributor {
  userId: string;
  count: number;
  lastWateredAt: number;
}

interface IBooster {
  type: string;
  startTime: number;
  duration: number;
}

interface ITreeStyle {
  styleName: string;
  active: boolean;
}

const ContributorSchema = new Schema<IContributor>({
  userId: { type: String, required: true },
  count: { type: Number, required: true, default: 1 },
  lastWateredAt: { type: Number, required: true, default: 0 }
});

const BoosterSchema = new Schema<IBooster>({
  type: { type: String, required: true },
  startTime: { type: Number, required: true },
  duration: { type: Number, required: true }
});

const TreeStyleSchema = new Schema<ITreeStyle>({
  styleName: { type: String, required: true },
  active: { type: Boolean, required: true, default: false }
});

const GuildSchema = new Schema<IGuild>({
  id: { type: String, required: true, unique: true, index: true },

  name: { type: String, required: true },
  size: { type: Number, required: true, default: 1, index: true },

  currentImageUrl: { type: String, required: false },
  hasAiAccess: { type: Boolean, required: true, default: false },
  superThirsty: { type: Boolean, required: true, default: false },
  isCheating: { type: Boolean, required: true, default: false },

  lastEventAt: { type: Number, required: true, default: Math.floor(Date.now() / 1000) },

  plantedAt: { type: Number, required: true, default: Math.floor(Date.now() / 1000) },

  lastWateredBy: { type: String, required: false },
  lastWateredAt: { type: Number, required: false },

  contributors: { type: [ContributorSchema], required: true, default: [] },

  notificationRoleId: { type: String, required: false },
  webhookId: { type: String, required: false },
  webhookToken: { type: String, required: false },

  timeZone: { type: String, required: true, default: "Europe/Amsterdam" },

  composter: {
    efficiencyLevel: { type: Number, required: true, default: 0 },
    qualityLevel: { type: Number, required: true, default: 0 }
  },

  activeBoosters: { type: [BoosterSchema], required: true, default: [] },

  unlockedTreeStyles: { type: [String], required: false, default: [] },

  treeStyles: { type: [TreeStyleSchema], required: true, default: [] }
});

const Contributor = model<IContributor>("Contributor", ContributorSchema);
const Booster = model<IBooster>("Booster", BoosterSchema);
const Guild = model<IGuild>("Guild", GuildSchema);

export {
  Guild,
  GuildSchema,
  Contributor,
  ContributorSchema,
  IGuild,
  IContributor,
  IBooster,
  BoosterSchema,
  Booster,
  ITreeStyle,
  TreeStyleSchema
};
