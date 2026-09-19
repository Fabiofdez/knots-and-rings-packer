import { Dir, Packs } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const Fusion = {
  /** @param {WoodDef} wood */
  updateWood(wood) {
    const hasVariants = WoodTypes.hasVariants(wood);
    setUpDirs(wood);

    Dir.makeTemp(`tmp/fusion/${wood.typeAsset}`, async (dir) => {
      if (hasVariants) SpriteMaker.FUSION.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) return;

      await SpriteMaker.FUSION.collectNewAssets(dir, wood);

      if (hasVariants) {
        Templates.Fusion.VARIANTS.defineFor(wood);
      }
    });
  },

  updateAll(woodSet = []) {
    console.log(`Updating all ${woodSet.length} wood types...`);

    Dir.makeTemp(`tmp/fusion/edges`, async (dir) => {
      await SpriteMaker.FUSION.updateWoodEdgeSprites(dir);
    });

    const woodAssets = woodSet.map((wood) => Wood.define(wood));
    for (const wood of woodAssets) {
      Fusion.updateWood(wood);
    }
  },
};

/** @param {WoodDef} wood */
function setUpDirs(wood) {
  if (!existsSync(wood.textures(Packs.FUSION))) {
    console.log(`Adding new '${wood.id}' wood type...`);
    execSync(`mkdir -p ${wood.textures(Packs.FUSION)}`);
  }

  Common.markToUpdate(wood);
}
