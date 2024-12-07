export interface CachedResponse<T> {
  cachedAt: number;
  expiresAt: number;
  data: T;
}
