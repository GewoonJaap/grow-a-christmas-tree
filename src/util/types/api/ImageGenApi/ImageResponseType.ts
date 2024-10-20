export interface ImageReponse {
  success: boolean;
  data?: ImageData;
}

export interface ImageData {
  url: string;
  metadata: Record<string, string>;
}
