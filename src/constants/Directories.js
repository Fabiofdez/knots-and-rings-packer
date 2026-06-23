import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

export const Dir = /** @type {const} */ ({
  CTM: "assets/minecraft/optifine/ctm",
  DEFAULT_SPRITES: "Knotted_Wood/sprite_defaults",
  VARIANT_SPRITES: "Knotted_Wood/spritesheet_variants",
  TOP_SPRITES: "Knotted_Wood/spritesheet_tops",
  EDGE_SPRITES: "Knotted_Wood/spritesheet_edges",

  get(path = "") {
    let exists = false;
    let contents = [];
  
    try {
      contents = readdirSync(path);
      exists = true;
    } catch (err) {
      if (!err.path) throw err;
    }
  
    return {
      exists,
      contents,
      path,
    };
  },

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
