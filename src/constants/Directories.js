import { execSync } from "node:child_process";

export const Dir = /** @type {const} */ ({
  MINECRAFT: "assets/minecraft",
  CTM: "optifine/ctm",

  DEFAULT_SPRITES: "Knotted_Wood/sprite_defaults",
  VARIANT_SPRITES: "Knotted_Wood/spritesheet_variants",
  TOP_SPRITES: "Knotted_Wood/spritesheet_tops",
  EDGE_SPRITES: "Knotted_Wood/spritesheet_edges",

  /**
   * @param {string} tmpDir
   * @param {(dir: string) => Promise<void>} predicate
   */
  async makeTemp(tmpDir, predicate) {
    execSync(`mkdir -p ${tmpDir}`);

    await predicate(tmpDir);

    execSync(`rm -r ${tmpDir}`);
  },
});
