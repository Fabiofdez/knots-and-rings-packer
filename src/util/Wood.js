import { Dir, Namespace } from "@const/Directories";
import { Ctx } from "@const/RunContext";

/** @type {{ [k: WoodType]: BaseWoodAssets }} */
const WOOD_CACHE = {};

/** @typedef {ReturnType<(typeof Wood)["baseAssets"]>} BaseWoodAssets */
export const Wood = {
  /** @param {WoodType} id */
  assetsCTM(id) {
    const wood = WOOD_CACHE[id] || this.baseAssets(id);

    return /** @type {const} */ ({
      ...wood,
      variantsDir: `${Ctx.WORK_DIR}/${Dir.CTM.forType(wood.namespace, wood.type)}`,
      topsDir: `${Ctx.WORK_DIR}/${Dir.CTM.forType(wood.namespace, wood.type)}/top`,
    });
  },

  /** @param {WoodType} id */
  assetsFusion(id) {
    const wood = WOOD_CACHE[id] || this.baseAssets(id);

    return /** @type {const} */ ({
      ...wood,
      modifiersDir: `${Ctx.WORK_DIR}/${Dir.FUSION.modelModifiers(wood.namespace)}/blocks`,
    });
  },

  /** @param {WoodType} id */
  baseAssets(id) {
    const [path, namespace = Namespace.VANILLA] = id.split(":").reverse();
    let assetPath = `${namespace}/${path}`;
    if (namespace === Namespace.VANILLA) assetPath = path;

    const wood = /** @type {const} */ ({
      type: path,
      namespace,
      logBlock: `${id}_log`,
      woodBlock: `${id}_wood`,

      id,
      assetPath,
      logAsset: `${path}_log`,
      woodAsset: `${path}_wood`,

      blockstatesDir: `${Ctx.WORK_DIR}/${Dir.blockstates(namespace)}`,
      modelsDir: `${Ctx.WORK_DIR}/${Dir.models(namespace)}/block`,
      texturesDir: `${Ctx.WORK_DIR}/${Dir.textures(namespace)}/block`,

      resId(customPath = "") {
        return /** @type {const} */ (
          `${this.namespace}:block/${customPath || this.logAsset}`
        );
      },

      logFaces() {
        return /** @type {const} */ ({
          BARK: `${this.logAsset}_side_bark`,
          SM: `${this.logAsset}_side_sm`,
          LEFT: `${this.logAsset}_side_left`,
          RIGHT: `${this.logAsset}_side_right`,
          CORE: `${this.logAsset}_side_core`,

          TOP: `${this.logAsset}_top`,
        });
      },

      logTop() {
        return /** @type {const} */ (`${this.logAsset}_top`);
      },
    });

    if (!WOOD_CACHE[wood.id]) WOOD_CACHE[wood.id] = wood;
    return wood;
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
