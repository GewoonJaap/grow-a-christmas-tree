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
