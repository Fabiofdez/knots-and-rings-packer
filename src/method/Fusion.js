import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { markToUpdate } from "@methods/common";
import { LOGGER } from "@util/Logger";
import { SpriteMaker } from "@util/SpriteMaker";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const Fusion = {
  /** @param {WoodAssetsFusion} wood */
  async updateWood(wood) {
    setUpDirs(wood);

    // TODO: Populate png.mcmeta files from templates

    Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/fusion/${wood.type}`, async (dir) => {
      SpriteMaker.Fusion.updateVariantSprites(dir, wood);
      SpriteMaker.Fusion.updateTopSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.type]) {
        execSync(`rm -rf ${dir}`);
        LOGGER.err(`Failed to update '${wood.type}' wood type`);
      }

      await SpriteMaker.Fusion.collectNewAssets(dir, wood);

      console.log(`...updated '${wood.type}' wood type`);
    });
  },
};

/** @param {WoodAssetsFusion} wood */
function setUpDirs(wood) {
  if (!existsSync(wood.texturesDir)) {
    console.log(`Adding new '${wood.type}' wood type...`);
    execSync(`mkdir -p ${wood.texturesDir}`);
  }

  markToUpdate(wood);
}
