import { Ctx } from "@const/RunContext";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const Packs = /** @type {const} */ ({
  DEFAULT: "pack_default",
  CTM: "pack_ctm",
  FUSION: "pack_fusion",
  SAPLINGS: "pack_saplings",
  STAY_TRUE: "pack_stay_true_compat",
});

export const Namespace = /** @type {const} */ ({
  MOD: "knots_and_rings",

  VANILLA: "minecraft",
  REGIONS_UNEXPLORED: "regions_unexplored",
});

export const Dir = /** @type {const} */ ({
  CTM: {
    /** @param {WoodDef} */
    variants({ namespace = Namespace.VANILLA, type }) {
      return /** @type {const} */ (
        `${Ctx.WORK_DIR}/${Packs.CTM}/assets/minecraft/optifine/ctm/${namespace}/${type}`
      );
    },
  },

  FUSION: {
    modelModifiers(namespace = Namespace.VANILLA) {
      return /** @type {const} */ (
        `${Packs.FUSION}/assets/${namespace}/fusion/model_modifiers`
      );
    },
  },

  MOD: {
    blockstates(/** @type {string} */ pack) {
      return Dir.blockstates(pack, Namespace.MOD);
    },

    items(/** @type {string} */ pack) {
      return Dir.items(pack, Namespace.MOD);
    },

    models(/** @type {string} */ pack) {
      return Dir.models(pack, Namespace.MOD);
    },

    textures(/** @type {string} */ pack) {
      return Dir.textures(pack, Namespace.MOD);
    },
  },

  blockstates(/** @type {string} */ pack, namespace = Namespace.VANILLA) {
    return /** @type {const} */ (
      `${Ctx.WORK_DIR}/${pack}/assets/${namespace}/blockstates`
    );
  },

  items(/** @type {string} */ pack, namespace = Namespace.VANILLA) {
    return /** @type {const} */ (
      `${Ctx.WORK_DIR}/${pack}/assets/${namespace}/items`
    );
  },

  models(/** @type {string} */ pack, namespace = Namespace.VANILLA) {
    return /** @type {const} */ (
      `${Ctx.WORK_DIR}/${pack}/assets/${namespace}/models`
    );
  },

  textures(/** @type {string} */ pack, namespace = Namespace.VANILLA) {
    return /** @type {const} */ (
      `${Ctx.WORK_DIR}/${pack}/assets/${namespace}/textures`
    );
  },

  DEFAULT_SPRITES: "Knotted_Wood/sprite_defaults",
  DEFAULT_TOP_SPRITES: "Knotted_Wood/sprite_top_defaults",
  VARIANT_SPRITES: "Knotted_Wood/spritesheet_variants",
  TOP_SPRITES: "Knotted_Wood/spritesheet_tops",
  SIDE_SPRITES: "Knotted_Wood/spritesheet_sides",
  EDGE_SPRITES: "Knotted_Wood/spritesheet_edges",
  SAPLING_SPRITES: "Knotted_Wood/spritesheet_saplings",
  SEED_SPRITES: "Knotted_Wood/sprite_seeds",

  /**
   * @param {string} tmpDir
   * @param {(dir: string) => Promise<void>} predicate
   */
  async makeTemp(tmpDir, predicate) {
    Ctx.PROCESSING = { ...Ctx.PROCESSING, [tmpDir]: true };
    const absolutePath = `${Ctx.WORK_DIR}/${tmpDir}`;

    execSync(`mkdir -p ${absolutePath}`);
    await predicate(absolutePath);

    delete Ctx.PROCESSING[tmpDir];
    if (!Object.keys(Ctx.PROCESSING).length) Dir.clearTemp();
  },

  clearTemp() {
    const tmpPath = `${Ctx.WORK_DIR}/tmp`;
    if (existsSync(tmpPath)) execSync(`rm -r ${tmpPath}`);
  },
});
