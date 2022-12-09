import { HydratedDocument } from "mongoose";
import fetch from "node-fetch";
import { ITree } from "../models/Guild";

const IMAGE_SERVER = "http://image-server:9090/tree/";
export const SHOW_LAST_X_BLOCKS = 5;

export async function renderTree(tree: HydratedDocument<ITree>): Promise<string> {
  if (tree.lastWateredAt > Math.floor(Date.now() / 1000)) tree.pieces.pop();

  const background = tree.background ?? "Ground";

  const id = tree.id;
  const pieces = tree.pieces.slice(-SHOW_LAST_X_BLOCKS).reverse();

  if (background === "Ground") pieces[pieces.length - 1] = 7;

  return fetchImage("", {
    id,

    background,
    pieces
  });
}

async function fetchImage(path: string, data: unknown): Promise<string> {
  try {
    const result = await fetch(IMAGE_SERVER + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(data)
    });

    if (!result.ok) {
      console.log(await result.text());
      throw new Error(`Failed to fetch image: ${result.statusText}`);
    }

    const image = await result.json();

    return `${image.url}`;
  } catch (err) {
    console.error(err);

    return "https://www.clipartmax.com/png/full/224-2247501_%C2%A0-tree-transparent.png";
  }
}
