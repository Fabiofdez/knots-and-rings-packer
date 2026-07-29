import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { LOGGER } from "@util/Logger";
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
    this.markToUpdate(wood);

    execSync(`mkdir -p ${wood.blockstatesDir}`);
    execSync(`mkdir -p ${wood.modelsDir}`);

    const isStripped = WoodFacts.isStripped(wood);
    const hasVariants = WoodTypes.hasVariants(wood);
    const condOverlay = WoodTypes.conditionalOverlay(wood);

    Dir.makeTemp(`tmp/common/${wood.assetPath}`, async (dir) => {
      if (hasVariants) await SpriteMaker.COMMON.updateVariantSprites(dir, wood);
      await SpriteMaker.COMMON.updateTopSprites(dir, wood);
      SpriteMaker.COMMON.updateLogSideSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) {
        execSync(`rm -rf ${dir}`);
        LOGGER.warn(`Failed to update '${wood.id}' wood type`);
        return;
      }

      if (isStripped) Templates.BLOCKSTATES.STRIPPED_LOG.defineFor(wood);
      else if (condOverlay) Templates.BLOCKSTATES.LOG_OVERLAY.defineFor(wood);
      else if (hasVariants) Templates.BLOCKSTATES.LOG.defineFor(wood);
      else Templates.BLOCKSTATES.LOG_NO_VARIANTS.defineFor(wood);

      if (hasVariants) Templates.BLOCKSTATES.WOOD.defineFor(wood);
      else Templates.BLOCKSTATES.WOOD_NO_VARIANTS.defineFor(wood);

      if (hasVariants) {
        Templates.MODELS.BARK_VARIANTS.defineFor(wood);
        if (condOverlay) Templates.MODELS.BARK_OVERLAY_VARIANTS.defineFor(wood);
      }

      Templates.MODELS.LOG_SIDES.defineFor(wood);
      Templates.MODELS.LOG_TOPS.defineFor(wood);
      Templates.MODELS.DEFAULT_LOG_TOPS.defineFor(wood);
    });

    console.log(`...updated '${wood.id}' wood type`);
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];

    const woodAssets = allWoods.map((wood) => Wood.baseAssets(wood));
    Templates.MODELS.LOG_EDGES.defineAll();

    for (const wood of woodAssets) {
      Common.updateWood(wood);
    }
  },
};
