import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { SpriteTypes } from "@const/SpriteTypes";
import { WoodTypes } from "@const/WoodTypes";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { globSync } from "glob";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/** @typedef {import("@util/Wood").WoodAssets} WoodAssets */

export const CTM = {
  /** @param {WoodAssets} wood */
  async updateWood(wood) {
    const variants = Dir.get(wood.variantsDir);
    const tops = Dir.get(wood.topsDir);

    if (!variants.exists && !tops.exists) {
      console.log(`Adding new '${wood.type}' wood type...`);
    }
    if (!variants.exists) execSync(`mkdir -p ${wood.variantsDir}`);
    if (!tops.exists) execSync(`mkdir -p ${wood.topsDir}`);

    Templates.CTM.LOG.updatePropsFor(wood);
    Templates.CTM.WOOD.updatePropsFor(wood);
    Templates.CTM.TOP.updatePropsFor(wood);

    updateAllSprites(wood);
  },

  /** @param {WoodAssets[]} woodAssets */
  updateEdges(woodAssets) {
    const ctmEdgesDir = `${Ctx.WORK_DIR}/${Dir.CTM}/_overlays/edges`;
    const ctmEdgesProps = globSync([
      `${ctmEdgesDir}/live_logs/*/*.ctm.properties`,
      `${ctmEdgesDir}/chopped_logs/*/*.ctm.properties`,
    ]);

    const blockStateTransform = {
      x: (wood, trunk) => `${WoodFacts.isTrunk(wood, trunk)}:axis=x`,
      y: (wood, trunk) => `${WoodFacts.isTrunk(wood, trunk)}:axis=y`,
      z_horizontal: (wood, trunk) => `${WoodFacts.isTrunk(wood, trunk)}:axis=z`,
      z_vertical: (wood, trunk) => `${WoodFacts.isTrunk(wood, trunk)}:axis=z`,
      wood: (wood) => wood.woodBlock,
    };

    for (const propsPath of ctmEdgesProps) {
      const [propsFile, _, ctxDir] = propsPath.split("/").reverse();
      const [overlayType] = propsFile.split(".");

      const trunkOnly = ctxDir === "live_logs";
      const matchBlocks = woodAssets
        .filter((wood) => (trunkOnly ? !WoodFacts.isStripped(wood) : true))
        .map((wood) => blockStateTransform[overlayType]?.(wood, trunkOnly))
        .filter((block) => block?.length > 0);

      const otherProps = readFileSync(propsPath)
        .toLocaleString()
        .split("\n")
        .filter((line) => !line.startsWith("matchBlocks"));

      const updatedProps = [
        "matchBlocks=" + [...new Set(matchBlocks)].sort().join(" "),
        ...otherProps,
      ];
      writeFileSync(propsPath, updatedProps.join("\n").trim() + "\n");
    }
  },

  updateAll() {
    console.log(`Updating all ${WoodTypes.VANILLA.length} wood types...`);

    const woodAssets = WoodTypes.VANILLA.map((wood) => Wood.assetsCTM(wood));
    CTM.updateEdges(woodAssets);

    for (const wood of woodAssets) {
      CTM.updateWood(wood);
    }
  },
};

/** @param {WoodAssets} wood */
function updateAllSprites(wood) {
  Dir.makeTemp(`${Ctx.WORK_DIR}/${wood.type}_tmp`, async (dir) => {
    await SpriteMaker.updateCtm(dir, wood, SpriteTypes.VARIANT);
    await SpriteMaker.updateCtm(dir, wood, SpriteTypes.TOPS);

    console.log(`...updated '${wood.type}' wood type`);
  });
}
