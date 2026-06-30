import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { markToUpdate } from "@methods/common";
import { LOGGER } from "@util/Logger";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

/** @type {import("prettier").Options} */
const formatOpts = { parser: "json", printWidth: 60 };

export const Fusion = {
  /** @param {WoodAssetsFusion} wood */
  async updateWood(wood) {
    const path = `${Ctx.WORK_DIR}/tmp/fusion/${wood.assetPath}`;

    const isStripped = WoodFacts.isStripped(wood);
    const hasVariants = WoodTypes.hasVariants(wood);
    setUpDirs(wood);

    Dir.makeTemp(path, async (dir) => {
      if (!isStripped) SpriteMaker.Fusion.updateTopSprites(dir, wood);
      if (hasVariants) SpriteMaker.Fusion.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) {
        execSync(`rm -rf ${dir}`);
        LOGGER.err(`Failed to update '${wood.type}' wood type`);
      }

      await SpriteMaker.Fusion.collectNewAssets(dir, wood);

      if (!isStripped) Templates.Fusion.TOP.updatePropsFor(wood);
      if (hasVariants) {
        Templates.Fusion.LOG.updatePropsFor(wood);
        Templates.Fusion.WOOD.updatePropsFor(wood);
      }

      console.log(`...updated '${wood.type}' wood type`);
    });
  },

  /** @param {WoodAssetsFusion[]} woodAssets */
  async updateEdges(woodAssets) {
    const [defaultWood] = woodAssets;

    /**
     * @param {string} wood
     * @param {boolean} isTrunk
     * @param {string} axis
     */
    const withState = (block, isTrunk, axis) => ({
      block,
      properties: { is_trunk: String(isTrunk), axis },
    });

    /**
     * @typedef {{
     *   x: string[];
     *   y: string[];
     *   z: string[];
     * }} TargetSet
     */
    const targets = {
      /** @type {TargetSet} */
      LIVE_LOG: { x: [], y: [], z: [] },
      /** @type {TargetSet} */
      CHOPPED_LOG: { x: [], y: [], z: [] },
      /** @type {string[]} */
      WOOD: [],
    };

    for (const wood of woodAssets) {
      targets.CHOPPED_LOG.x.push(withState(wood.logBlock, false, "x"));
      targets.CHOPPED_LOG.y.push(withState(wood.logBlock, false, "y"));
      targets.CHOPPED_LOG.z.push(withState(wood.logBlock, false, "z"));

      targets.WOOD.push(wood.woodBlock);

      if (WoodFacts.isStripped(wood)) continue;

      targets.LIVE_LOG.x.push(withState(wood.logBlock, true, "x"));
      targets.LIVE_LOG.y.push(withState(wood.logBlock, true, "y"));
      targets.LIVE_LOG.z.push(withState(wood.logBlock, true, "z"));
    }

    /**
     * @param {string} fileName
     * @param {string[]} targets
     */
    const saveModifier = async (fileName, targets) => {
      const modifierPath = `${defaultWood.modifiersDir}/${fileName}`;
      const data = JSON.parse(readFileSync(modifierPath).toLocaleString());
      data.targets = targets;

      const formattedJSON = await format(JSON.stringify(data), formatOpts);
      writeFileSync(modifierPath, formattedJSON);
    };

    /**
     * @param {(axis: string) => string} filePredicate
     * @param {(typeof targets)[keyof typeof targets]} targetSet
     */
    const saveModifierSet = async (filePredicate, targetSet) => {
      saveModifier(filePredicate("x"), targetSet.x);
      saveModifier(filePredicate("y"), targetSet.y);
      saveModifier(filePredicate("z"), targetSet.z);
    };

    saveModifierSet((axis) => `live_log_edges_${axis}.json`, targets.LIVE_LOG);
    saveModifierSet((axis) => `log_edges_${axis}.json`, targets.CHOPPED_LOG);
    saveModifier("wood_edges.json", targets.WOOD);
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];
    console.log(`Updating all ${allWoods.length} wood types...`);

    const woodAssets = allWoods.map((wood) => Wood.assetsFusion(wood));
    Fusion.updateEdges(woodAssets);

    // Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/fusion/edges`, async (dir) => {
    //   await SpriteMaker.Fusion.updateWoodEdgeSprites(dir);
    // });

    for (const wood of woodAssets) {
      Fusion.updateWood(wood);
    }
  },
};

/** @param {WoodAssetsFusion} wood */
function setUpDirs(wood) {
  if (!existsSync(wood.texturesDir)) {
    console.log(`Adding new '${wood.type}' wood type...`);
    execSync(`mkdir -p ${wood.texturesDir}`);
  }

  markToUpdate(wood);
}
