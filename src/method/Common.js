import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { LOGGER } from "@util/Logger";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

export const Common = {
  /** @param {WoodDef} wood */
  markToUpdate(wood) {
    Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.id]: true };
  },

  /** @param {WoodDef} wood */
  updateWood(wood) {
    this.markToUpdate(wood);

    execSync(`mkdir -p ${wood.blockstates()}`);
    execSync(`mkdir -p ${wood.models()}`);

    const condOverlay = WoodTypes.conditionalOverlay(wood);

    Dir.makeTemp(`tmp/common/${wood.typeAsset}`, async (dir) => {
      await SpriteMaker.COMMON.updateTopSprites(dir, wood);
      SpriteMaker.COMMON.updateLogSideSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) {
        execSync(`rm -rf ${dir}`);
        LOGGER.warn(`Failed to update '${wood.id}' wood type`);
        return;
      }

      Templates.BLOCKSTATES.WOOD.defineFor(wood);

      if (condOverlay) Templates.BLOCKSTATES.LOG_OVERLAY.defineFor(wood);
      else Templates.BLOCKSTATES.LOG.defineFor(wood);

      Templates.MODELS.LOG.defineFor(wood);
      Templates.MODELS.WOOD.defineFor(wood);
    });

    console.log(`...updated '${wood.id}' wood type`);
  },

  updateAll(woodSet = []) {
    console.log(`Updating all ${woodSet.length} wood types...`);

    const woodAssets = woodSet.map((wood) => Wood.define(wood));
    for (const wood of woodAssets) {
      Common.updateWood(wood);
    }
  },
};
