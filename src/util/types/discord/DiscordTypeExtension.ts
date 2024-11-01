export interface Entitlement {
  id: string;
  sku_id: string;
  application_id: string;
  user_id?: string;
  type: number;
  deleted: boolean;
  starts_at?: string;
  ends_at?: string;
  guild_id?: string;
  consumed?: boolean;
}

export enum EntitlementType {
  UNLIMITED_LEVELS,
  SUPER_THIRSTY,
  UNKNOWN
}

export interface WebhookCreatedResponse {
  id: string;
  type: number;
  guild_id?: string;
  channel_id: string;
  user?: object;
  name?: string;
  avatar?: string;
  token?: string;
  application_id?: string;
  source_guild?: object;
  source_channel?: object;
  url?: string;
}

export interface WebhookMessageResponse {
  type: number;
  content: string;
  mentions: string[];
  mention_roles: string[];
  attachments: string[];
  embeds: Embed[];
  timestamp: string;
  edited_timestamp: string;
  flags: number;
  components: unknown[];
  id: string;
  channel_id: string;
  author: Author;
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  webhook_id: string;
}

export interface Embed {
  type: string;
  description: string;
  color: number;
  content_scan_version: number;
}

export interface Author {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  public_flags: number;
  flags: number;
  bot: boolean;
  global_name: string;
  clan: string;
}

export enum ButtonStyleTypes {
  PRIMARY = 1,
  SECONDARY = 2,
  SUCCESS = 3,
  DANGER = 4,
  LINK = 5,
  PREMIUM = 6
}
