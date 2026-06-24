import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { setUpDirectories } from "@methods/common";
import { LOGGER } from "@util/Logger";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood, WoodFacts } from "@util/Wood";
import { globSync } from "glob";
import { readFileSync, writeFileSync } from "node:fs";

export const CTM = {
  /** @param {WoodAssetsCTM} wood */
  async updateWood(wood) {
    setUpDirectories(wood);

    Dir.makeTemp(`${Ctx.WORK_DIR}/tmp/ctm/${wood.type}`, async (dir) => {
      await SpriteMaker.CTM.updateVariantSprites(dir, wood);
      await SpriteMaker.CTM.updateTopSprites(dir, wood);

      if (!Ctx.NEW_WOODS?.[wood.type]) {
        LOGGER.err(`Failed to update '${wood.type}' wood type`);
      }

      Templates.CTM.LOG.updatePropsFor(wood);
      Templates.CTM.WOOD.updatePropsFor(wood);
      Templates.CTM.TOP.updatePropsFor(wood);

      console.log(`...updated '${wood.type}' wood type`);
    });
  },

  /** @param {WoodAssetsCTM[]} woodAssets */
  updateEdges(woodAssets) {
    const ctmEdgesDir = `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/${Dir.CTM}/_overlays/edges`;
    const ctmEdgesProps = globSync([
      `${ctmEdgesDir}/live_logs/*/*.ctm.properties`,
      `${ctmEdgesDir}/chopped_logs/*/*.ctm.properties`,
    ]);

    const state = (wood, isTrunk) => `${wood.logBlock}:is_trunk=${isTrunk}`;

    const blockStateTransform = {
      x: (wood, isTrunk) => `${state(wood, isTrunk)}:axis=x`,
      y: (wood, isTrunk) => `${state(wood, isTrunk)}:axis=y`,
      z_horizontal: (wood, isTrunk) => `${state(wood, isTrunk)}:axis=z`,
      z_vertical: (wood, isTrunk) => `${state(wood, isTrunk)}:axis=z`,
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
