import { BoosterHelper } from "./booster/BoosterHelper";
import { ButtonContext, SlashCommandContext } from "interactions.ts";

const cache = new Map();
const maxInterval = 600; // in seconds, 10 mins

export function getWateringInterval(
  ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>,
  size: number,
  superThirsty = false
): number {
  const cached = cache.has(size);
  let result = cached ? cache.get(size) : Math.floor(Math.pow(size * 0.05 + 5, 1.1));

  if (result > maxInterval) {
    result = maxInterval;
  }

  if (!cached) cache.set(size, result);

  if (superThirsty) result = Math.floor(result / 2);

  result = BoosterHelper.tryApplyBoosterEffectOnNumber(ctx, "Watering Booster", result);

  return result;
}

export function getTreeAge(ctx: SlashCommandContext | ButtonContext | ButtonContext<unknown>, size: number): number {
  let age = 0;

  for (let i = 0; i < size; i++) {
    age += getWateringInterval(ctx, i);
  }

  return age;
}
