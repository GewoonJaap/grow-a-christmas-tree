export interface ImageStylesReponse {
  success: boolean;
  styles: ImageStyle[];
}

export interface ImageStyle {
  name: string;
  description: string;
  url?: string;
}
