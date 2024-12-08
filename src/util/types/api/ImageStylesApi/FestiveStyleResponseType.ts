import { ImageStyle } from "./ImageStylesResponseType";

export interface FestiveImageStylesReponse {
  success: boolean;
  styles: FestiveImageStyle[];
}

export interface FestiveImageStyle extends ImageStyle {
  cost: number;
}
