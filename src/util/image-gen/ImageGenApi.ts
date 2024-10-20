import { ImageReponse } from "../types/api/ImageGenApi/ImageResponseType";

export class ImageGenApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;

  public constructor() {
    if (this.apiUrl === undefined) {
      throw new Error("IMAGE_GEN_API environment variable is not set");
    }
  }

  public async getGeneratedImage(guildId: string, treeLevel: number): Promise<ImageReponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/tree/${guildId}/${treeLevel}/image`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  }
}
