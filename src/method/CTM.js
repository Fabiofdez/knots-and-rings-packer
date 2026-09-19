import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const CTM = {
  /** @param {WoodDef} wood */
  updateWood(wood) {
    const hasVariants = WoodTypes.hasVariants(wood);
    setUpDirs(wood, hasVariants);

    Dir.makeTemp(`tmp/ctm/${wood.typeAsset}`, async (dir) => {
      if (hasVariants) await SpriteMaker.CTM.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) {
        removeDirs(wood);
        return;
      }

      if (hasVariants) Templates.CTM.VARIANTS.defineFor(wood);
    });
  },

  updateAll(woodSet = []) {
    console.log(`Updating all ${woodSet.length} wood types...`);

    const woodAssets = woodSet.map((wood) => Wood.define(wood));
    for (const wood of woodAssets) {
      CTM.updateWood(wood);
    }
  },
};

/**
 * @param {WoodDef} wood
 * @param {boolean} makeVariants
 */
function setUpDirs(wood, makeVariants) {
  const variantsDir = Dir.CTM.variants(wood);
  const existingVariants = existsSync(variantsDir);

  if (makeVariants && !existingVariants) {
    console.log(`Adding new '${wood.id}' wood type...`);
  }

  if (!existingVariants) {
    if (makeVariants) execSync(`mkdir -p ${variantsDir}`);
  } else {
    if (!makeVariants && wood.isStripped()) execSync(`rm -rf ${variantsDir}`);
  }

  Common.markToUpdate(wood);
}

/** @param {WoodDef} wood */
function removeDirs(wood) {
  const variantsDir = Dir.CTM.variants(wood);
  if (existsSync(variantsDir)) execSync(`rm -rf ${variantsDir}`);
}
