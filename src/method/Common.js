import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { execSync } from "child_process";

export const Common = {
  /** @param {BaseWoodAssets} wood */
  markToUpdate(wood) {
    Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.id]: true };
  },

  /** @param {BaseWoodAssets} wood */
  updateWood(wood) {
    if (WoodFacts.isStripped(wood)) return;

    execSync(`mkdir -p ${wood.blockstatesDir}`);
    execSync(`mkdir -p ${wood.modelsDir}`);

    Dir.makeTemp(`tmp/common/${wood.assetPath}`, async (dir) => {
      await SpriteMaker.COMMON.updateTopSprites(dir, wood);
      SpriteMaker.COMMON.updateLogSideSprites(dir, wood);

      Templates.BLOCKSTATES.LOG.defineFor(wood);
      Templates.MODELS.LOG_SIDES.defineFor(wood);
      Templates.MODELS.LOG_TOPS.defineFor(wood);
    });
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];

    const woodAssets = allWoods.map((wood) => Wood.baseAssets(wood));

    for (const wood of woodAssets) {
      Common.updateWood(wood);
    }
  },
};
