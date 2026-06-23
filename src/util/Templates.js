import { Ctx } from "@const/RunContext";
import { WoodFacts } from "@util/Wood";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * @typedef {import("@util/Wood").WoodAssets} WoodAssets
 *
 * @typedef {(wood: WoodAssets) => string} WoodPredicate
 *
 * @typedef {{
 *   baseFile: string;
 *   outputFor: WoodPredicate;
 *   targetFor: WoodPredicate;
 * }} PropTemplate
 */

/** @param {PropTemplate} T */
const use = (T) => ({
  /** @param {WoodAssets} wood */
  updatePropsFor(wood) {
    const outFile = T.outputFor(wood);
    execSync(`cp ${Ctx.TEMPLATES_DIR}/${T.baseFile} ${outFile}`);

    const buf = readFileSync(outFile);
    const props = buf.toLocaleString();
    const updated = props.replace(/TEMPLATE_BLOCK/g, T.targetFor(wood));
    writeFileSync(outFile, updated);
  },
});

export const Templates = {
  CTM: {
    LOG: use({
      baseFile: "template_log.properties",
      outputFor: (wood) => `${wood.variantsDir}/log.properties`,
      targetFor: (wood) => wood.logBlock,
    }),

    WOOD: use({
      baseFile: "template_wood.properties",
      outputFor: (wood) => `${wood.variantsDir}/wood.properties`,
      targetFor: (wood) => wood.woodBlock,
    }),

    TOP: use({
      baseFile: "top.ctm.properties",
      outputFor: (wood) => `${wood.topsDir}/ctm.properties`,
      targetFor: (wood) => WoodFacts.isTrunk(wood),
    }),
  },
};
