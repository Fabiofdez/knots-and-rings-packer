import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { SpriteMaker } from "@util/SpriteMaker";
import { Wood, WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

/** @type {import("prettier").Options} */
const formatOpts = { parser: "json", printWidth: 60 };

export const Fusion = {
  /** @param {WoodAssetsFusion} wood */
  updateWood(wood) {
    const hasVariants = WoodTypes.hasVariants(wood);
    const isStripped = WoodFacts.isStripped(wood);
    // setUpDirs(wood);

    Dir.makeTemp(`tmp/fusion/${wood.assetPath}`, async (dir) => {
      // if (!isStripped) SpriteMaker.Fusion.updateTopSprites(dir, wood);
      // if (hasVariants) SpriteMaker.Fusion.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) return;

      // await SpriteMaker.Fusion.collectNewAssets(dir, wood);

      // if (!isStripped) Templates.Fusion.TOP.defineFor(wood);
      // if (hasVariants) {
      //   Templates.Fusion.LOG_VARIANTS.defineFor(wood);
      //   Templates.Fusion.WOOD_VARIANTS.defineFor(wood);
      // }
    });
  },

  /** @param {WoodAssetsFusion[]} woodAssets */
  updateEdges(woodAssets) {
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

    // TODO: remove unneeded modifiers
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
    const saveModifierSet = (filePredicate, targetSet) => {
      saveModifier(filePredicate("x"), targetSet.x);
      saveModifier(filePredicate("y"), targetSet.y);
      saveModifier(filePredicate("z"), targetSet.z);
    };

    // saveModifierSet((axis) => `live_log_edges_${axis}.json`, targets.LIVE_LOG);
    // saveModifierSet((axis) => `log_edges_${axis}.json`, targets.CHOPPED_LOG);
    saveModifier("wood_edges.json", targets.WOOD);
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];
    console.log(`Updating all ${allWoods.length} wood types...`);

    const woodAssets = allWoods.map((wood) => Wood.assetsFusion(wood));
    Fusion.updateEdges(woodAssets);

    Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/fusion/edges`, async (dir) => {
      // await SpriteMaker.Fusion.updateLogEdgeSprites(dir);
      await SpriteMaker.Fusion.updateWoodEdgeSprites(dir);
    });

    // for (const wood of woodAssets) {
    //   Fusion.updateWood(wood);
    // }
  },
};

/** @param {WoodAssetsFusion} wood */
function setUpDirs(wood) {
  if (!existsSync(wood.texturesDir)) {
    console.log(`Adding new '${wood.id}' wood type...`);
    execSync(`mkdir -p ${wood.texturesDir}`);
  }

  Common.markToUpdate(wood);
}
