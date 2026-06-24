import { Ctx } from "@const/RunContext";

/** @param {WoodAssetsCTM | WoodAssetsFusion} wood */
export function markToUpdate(wood) {
  Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.type]: true };
}
