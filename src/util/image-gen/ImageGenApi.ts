import { HasImageReponseType } from "../types/api/ImageGenApi/HasImageResponseType";
import { ImageReponse } from "../types/api/ImageGenApi/ImageResponseType";

export class ImageGenApi {
  private apiUrl: string | undefined = process.env.IMAGE_GEN_API;

  public constructor() {
    if (this.apiUrl === undefined) {
      throw new Error("IMAGE_GEN_API environment variable is not set");
    }
  }

  public async getGeneratedImage(guildId: string, treeLevel: number): Promise<ImageReponse> {
    console.log(`Getting image for guild ${guildId} and tree level ${treeLevel}`);
    try {
      const response = await fetch(`${this.apiUrl}/api/tree/${guildId}/${treeLevel}/image`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  }

  public async getHasGeneratedImage(guildId: string, treeLevel: number): Promise<boolean> {
    console.log(`Checking if image exists for guild ${guildId} and tree level ${treeLevel}`);
    try {
      const response = await fetch(`${this.apiUrl}/api/tree/${guildId}/${treeLevel}/has-image`);
      const jsonResponse = (await response.json()) as HasImageReponseType;
      return jsonResponse.exists;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}