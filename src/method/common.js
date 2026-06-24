import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { execSync } from "node:child_process";

/** @param {WoodAssetsCTM | WoodAssetsFusion} wood */
export function setUpDirectories(wood) {
  const variants = Dir.get(wood.variantsDir);
  const tops = Dir.get(wood.topsDir);

  if (!variants.exists && !tops.exists) {
    console.log(`Adding new '${wood.type}' wood type...`);
  }
  if (!variants.exists) execSync(`mkdir -p ${wood.variantsDir}`);
  if (!tops.exists) execSync(`mkdir -p ${wood.topsDir}`);

  markToUpdate(wood);
}

/** @param {WoodAssetsCTM | WoodAssetsFusion} wood */
function markToUpdate(wood) {
  Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.type]: true };
}
