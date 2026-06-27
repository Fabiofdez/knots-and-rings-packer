import { Ctx } from "@const/RunContext";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * @template T
 * @typedef {(wood: T) => string} WoodPredicate
 */

/**
 * @template T
 * @typedef {{
 *   baseFile: string;
 *   output: WoodPredicate<T>;
 *   modifyTarget: WoodPredicate<T>;
 * }} PropTemplate
 */
/**
 * @template T
 * @typedef {(thisProps: PropTemplate<T>) => {
 *   updatePropsFor: (wood: T) => void;
 * }} TemplateDef
 */

/**
 * @typedef {WoodAssetsCTM & WoodAssetsFusion} WoodAssets
 * @type {TemplateDef<WoodAssets>}
 */
const use = (T) => ({
  updatePropsFor(wood) {
    const outFile = T.output(wood);
    execSync(`cp ${Ctx.WORK_DIR}/templates/${T.baseFile} ${outFile}`);

    if (typeof T.modifyTarget !== "function") return;

    let content = readFileSync(outFile).toLocaleString();
    content = content.replace(/TEMPLATE_BLOCK/g, T.modifyTarget(wood));

    writeFileSync(outFile, content);
  },
});

export const Templates = {
  CTM: {
    LOG: use({
      baseFile: "template_log.properties",
      output: (wood) => `${wood.variantsDir}/log.properties`,
      modifyTarget: (wood) => wood.logBlock,
    }),

    WOOD: use({
      baseFile: "template_wood.properties",
      output: (wood) => `${wood.variantsDir}/wood.properties`,
      modifyTarget: (wood) => wood.woodBlock,
    }),

    TOP: use({
      baseFile: "top.ctm.properties",
      output: (wood) => `${wood.topsDir}/ctm.properties`,
      modifyTarget: (wood) => wood.logBlock,
    }),
  },

  Fusion: {
    LOG: use({
      baseFile: "variants.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.logAsset}.png.mcmeta`,
    }),

    WOOD: use({
      baseFile: "variants.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.woodAsset}.png.mcmeta`,
    }),

    TOP: use({
      baseFile: "top.png.mcmeta",
      output: (wood) => `${wood.texturesDir}/${wood.logAsset}_top.png.mcmeta`,
      modifyTarget: (w) => w.logBlock,
    }),
  },
};
