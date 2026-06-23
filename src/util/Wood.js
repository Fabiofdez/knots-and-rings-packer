import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";

/** @param {WoodType} woodType */
function baseAssets(woodType) {
  return /** @type {const} */ ({
    type: woodType,
    logBlock: `${woodType}_log`,
    woodBlock: `${woodType}_wood`,
  });
}

/**
 * @typedef {ReturnType<typeof Wood.assetsCTM>} WoodAssets
 *
 * @typedef {(typeof WoodTypes.VANILLA)[number]} WoodType
 */

export const Wood = {
  /** @param {WoodType} woodType */
  assetsCTM(woodType) {
    return /** @type {const} */ ({
      ...baseAssets(woodType),
      variantsDir: `${Ctx.WORK_DIR}/${Dir.CTM}/${woodType}`,
      topsDir: `${Ctx.WORK_DIR}/${Dir.CTM}/_overlays/${woodType}_log_top`,
    });
  },
};

export const WoodFacts = {
  /**
   * @param {WoodAssets} wood
   * @param {boolean} value
   */
  isTrunk(wood, value = true) {
    return /** @type {const} */ (`${wood.logBlock}:is_trunk=${value}`);
  },

  /** @param {WoodAssets} wood */
  isStripped(wood) {
    return wood.logBlock.startsWith("stripped_");
  },
};
