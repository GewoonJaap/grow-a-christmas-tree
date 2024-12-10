import { BoosterHelper } from "./booster/BoosterHelper";
import { ButtonContext, SlashCommandContext } from "interactions.ts";

const cache = new Map()
  
//const maxInterval = 600; // in seconds, 10 mins

export function getWateringInterval(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
  size: number,
  superThirsty = false
): number {
  const cached = cache.has(size);
  let result = cached ? cache.get(size) : getWateringIntervalInSeconds(size);

  if (!cached) cache.set(size, result);

  if (superThirsty) result = Math.floor(result / 2);

  result = Math.floor(BoosterHelper.tryApplyBoosterEffectOnNumber(ctx, "Watering Booster", result));

  return Math.floor(result);
}

function getWateringIntervalInSeconds(size: number): number {
  if(size <= 2000) {
    return Math.floor(Math.pow(size * 0.05 + 5, 1.1))
  }
  //Some base modifier to make the start of the line correct.
  return (141 + Math.floor(Math.pow(size * 0.01 + 5, 1.05)))
}

export function getTreeAge(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>, size: number): number {
  let age = 0;

  for (let i = 0; i < size; i++) {
    age += getWateringInterval(ctx, i);
  }

  return age;
}
