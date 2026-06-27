import { Ctx } from "@const/RunContext";

/** @param {BaseWoodAssets} wood */
export function markToUpdate(wood) {
  Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.id]: true };
}
