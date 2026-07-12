import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";

export const Namespace = {
  VANILLA: "minecraft",
  REGIONS_UNEXPLORED: "regions_unexplored",
};

/**
 * @typedef {ReturnType<typeof baseAssets>} BaseWoodAssets
 *
 * @typedef {(typeof WoodTypes.VANILLA)[number]} WoodType
 */

export const Wood = {
  /** @param {WoodType} id */
  assetsCTM(id) {
    const wood = baseAssets(id);

    return /** @type {const} */ ({
      ...wood,
      variantsDir: `${Ctx.WORK_DIR}/${Dir.CTM.forType(wood)}`,
      topsDir: `${Ctx.WORK_DIR}/${Dir.CTM.forType(wood)}/top`,
    });
  },

  /** @param {WoodType} id */
  assetsFusion(id) {
    const wood = baseAssets(id);

    return /** @type {const} */ ({
      ...wood,
      texturesDir: `${Ctx.WORK_DIR}/${Dir.FUSION.textures(wood.namespace)}/block`,
      modifiersDir: `${Ctx.WORK_DIR}/${Dir.FUSION.modelModifiers(wood.namespace)}/blocks`,
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
    return wood.logBlock.includes("stripped");
  },
};

/** @param {WoodType} id */
function baseAssets(id) {
  const [path, namespace = Namespace.VANILLA] = id.split(":").reverse();
  let assetPath = `${namespace}/${path}`;
  if (namespace === Namespace.VANILLA) assetPath = path;

  return /** @type {const} */ ({
    type: path,
    namespace,
    logBlock: `${id}_log`,
    woodBlock: `${id}_wood`,

    id,
    assetPath,
    logAsset: `${path}_log`,
    woodAsset: `${path}_wood`,
  });
}
