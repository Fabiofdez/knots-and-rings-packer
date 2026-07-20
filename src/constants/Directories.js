import { Ctx } from "@const/RunContext";
import { execSync } from "node:child_process";

export const Namespace = {
  VANILLA: "minecraft",
  REGIONS_UNEXPLORED: "regions_unexplored",
};

export const Dir = /** @type {const} */ ({
  CTM: {
    ROOT: "assets/minecraft/optifine/ctm",

    forType: (namespace = Namespace.VANILLA, type) =>
      /** @type {const} */ (`${Dir.CTM.ROOT}/${namespace}/${type}`),
  },

  FUSION: {
    modelModifiers: (namespace = Namespace.VANILLA) =>
      /** @type {const} */ (`assets/${namespace}/fusion/model_modifiers`),
  },

  blockstates: (namespace = Namespace.VANILLA) =>
    /** @type {const} */ (`assets/${namespace}/blockstates`),

  models: (namespace = Namespace.VANILLA) =>
    /** @type {const} */ (`assets/${namespace}/models`),

  textures: (namespace = Namespace.VANILLA) =>
    /** @type {const} */ (`assets/${namespace}/textures`),

  DEFAULT_SPRITES: "Knotted_Wood/sprite_defaults",
  VARIANT_SPRITES: "Knotted_Wood/spritesheet_variants",
  TOP_SPRITES: "Knotted_Wood/spritesheet_tops",
  EDGE_SPRITES: "Knotted_Wood/spritesheet_edges",

  /**
   * @param {string} tmpDir
   * @param {(dir: string) => Promise<void>} predicate
   */
  async makeTemp(tmpDir, predicate) {
    const absolutePath = `${Ctx.WORK_DIR}/${tmpDir}`;

    execSync(`mkdir -p ${absolutePath}`);
    await predicate(tmpDir);
    execSync(`rm -r ${absolutePath}`);
  },
});
