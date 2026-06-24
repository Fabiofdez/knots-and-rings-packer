import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { setUpDirectories } from "@methods/common";
import { SpriteMaker } from "@util/SpriteMaker";

export const Fusion = {
  /** @param {WoodAssetsCTM} wood */
  async updateWood(wood) {
    setUpDirectories(wood);

    // TODO: Populate png.mcmeta files from templates

    Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/fusion/${wood.type}`, async (dir) => {
      SpriteMaker.Fusion.updateVariantSprites(dir, wood);
      SpriteMaker.Fusion.updateTopSprites(dir, wood);

      await SpriteMaker.Fusion.collectNewAssets(dir, wood);

      console.log(`...updated '${wood.type}' wood type`);
    });
  },
};
