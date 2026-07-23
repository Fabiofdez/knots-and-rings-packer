import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { Wood, WoodFacts } from "@util/Wood";
import { globSync } from "glob";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const CTM = {
  /** @param {WoodAssetsCTM} wood */
  updateWood(wood) {
    const isStripped = WoodFacts.isStripped(wood);
    const hasVariants = WoodTypes.hasVariants(wood);
    // setUpDirs(wood, isStripped, hasVariants);

    Dir.makeTemp(`tmp/ctm/${wood.assetPath}`, async (dir) => {
      // if (!isStripped) await SpriteMaker.CTM.updateTopSprites(dir, wood);
      // if (hasVariants) await SpriteMaker.CTM.updateVariantSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.id]) return removeDirs(wood);

      // if (!isStripped) Templates.CTM.TOP.defineFor(wood);
      // if (hasVariants) {
      //   Templates.CTM.LOG_VARIANTS.defineFor(wood);
      //   Templates.CTM.WOOD_VARIANTS.defineFor(wood);
      // }
    });
  },

  /** @param {WoodAssetsCTM[]} woodAssets */
  updateEdges(woodAssets) {
    const ctmEdgesDir = `${Ctx.WORK_DIR}/${Dir.CTM.ROOT}/_overlays/edges`;
    const ctmEdgesProps = globSync([
      // `${ctmEdgesDir}/live_logs/*/*.ctm.properties`,
      // `${ctmEdgesDir}/chopped_logs/*/*.ctm.properties`,
      `${ctmEdgesDir}/live_logs/wood/wood.ctm.properties`,
    ]);

    /**
     * @param {WoodAssetsCTM} wood
     * @param {boolean} isTrunk
     * @param {string} axis
     */
    const state = (wood, isTrunk, axis) => {
      if (WoodFacts.isStripped(wood)) return `${wood.logBlock}:axis=${axis}`;
      return `${wood.logBlock}:is_trunk=${isTrunk}:axis=${axis}`;
    };

    /**
     * @type {{
     *   [k: string]: (wood: WoodAssetsCTM, isTrunk: boolean) => string;
     * }}
     */
    const blockStateTransform = {
      x: (wood, isTrunk) => state(wood, isTrunk, "x"),
      y: (wood, isTrunk) => state(wood, isTrunk, "y"),
      z_horizontal: (wood, isTrunk) => state(wood, isTrunk, "z"),
      z_vertical: (wood, isTrunk) => state(wood, isTrunk, "z"),
      wood: (wood) => wood.woodBlock,
    };

    for (const propsPath of ctmEdgesProps) {
      const [propsFile, _, ctxDir] = propsPath.split("/").reverse();
      const [overlayType] = propsFile.split(".");

      const trunkOnly = ctxDir === "live_logs" && overlayType !== "wood";
      const matchBlocks = woodAssets
        .filter((wood) => (trunkOnly ? !WoodFacts.isStripped(wood) : true))
        .map((wood) => blockStateTransform[overlayType]?.(wood, trunkOnly))
        .filter((block) => block?.length > 0);

      const otherProps = readFileSync(propsPath)
        .toLocaleString()
        .split("\n")
        .filter((line) => !line.startsWith("matchBlocks"));

      const updatedProps = [
        `matchBlocks=${[...new Set(matchBlocks)].sort().join(" ")}`,
        ...otherProps,
      ];
      writeFileSync(propsPath, updatedProps.join("\n").trim() + "\n");
    }
  },

  updateAll() {
    const allWoods = [...WoodTypes.VANILLA, ...WoodTypes.REGIONS_UNEXPLORED];
    console.log(`Updating all ${allWoods.length} wood types...`);

    const woodAssets = allWoods.map((wood) => Wood.assetsCTM(wood));
    CTM.updateEdges(woodAssets);

    // for (const wood of woodAssets) {
    //   CTM.updateWood(wood);
    // }
  },
};

/**
 * @param {WoodAssetsCTM} wood
 * @param {boolean} isStripped
 * @param {boolean} makeVariants
 */
function setUpDirs(wood, isStripped, makeVariants) {
  const existingVariants = existsSync(wood.variantsDir);
  const existingTops = existsSync(wood.topsDir);

  if (makeVariants && !existingVariants && (isStripped || !existingTops)) {
    console.log(`Adding new '${wood.id}' wood type...`);
  }

  if (!existingVariants) {
    if (makeVariants) execSync(`mkdir -p ${wood.variantsDir}`);
  } else {
    if (!makeVariants && isStripped) execSync(`rm -rf ${wood.variantsDir}`);
  }

  if (!existingTops) {
    if (!isStripped) execSync(`mkdir -p ${wood.topsDir}`);
  } else {
    if (isStripped) execSync(`rm -rf ${wood.topsDir}`);
  }

  Common.markToUpdate(wood);
}

/** @param {WoodAssetsCTM} wood */
function removeDirs(wood) {
  if (existsSync(wood.variantsDir)) execSync(`rm -rf ${wood.variantsDir}`);
  if (existsSync(wood.topsDir)) execSync(`rm -rf ${wood.topsDir}`);
}
