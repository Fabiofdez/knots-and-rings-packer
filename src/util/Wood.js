import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";

/**
 * @typedef {ReturnType<typeof baseAssets>} BaseWoodAssets
 *
 * @typedef {(typeof WoodTypes.VANILLA)[number]} WoodType
 */

/** @param {WoodType} woodType */
function baseAssets(woodType) {
  return /** @type {const} */ ({
    type: woodType,
    logBlock: `${woodType}_log`,
    woodBlock: `${woodType}_wood`,
  });
}

export const Wood = {
  /** @param {WoodType} woodType */
  assetsCTM(woodType) {
    return /** @type {const} */ ({
      ...baseAssets(woodType),
      variantsDir: `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/${Dir.CTM}/${woodType}`,
      topsDir: `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/${Dir.CTM}/_overlays/${woodType}_log_top`,
    });
  },

  /** @param {WoodType} woodType */
  assetsFusion(woodType) {
    return /** @type {const} */ ({
      ...baseAssets(woodType),
      texturesDir: `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/textures/block`,
      modifiersDir: `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/fusion/model_modifiers/blocks`,
    });
  },
};

export const WoodFacts = {
  /**
   * @param {BaseWoodAssets} wood
   * @param {boolean} value
   */
  isTrunk(wood, value = true) {
    return /** @type {const} */ (`${wood.logBlock}:is_trunk=${value}`);
  },

  /** @param {BaseWoodAssets} wood */
  isStripped(wood) {
    return wood.logBlock.startsWith("stripped_");
  },
};
