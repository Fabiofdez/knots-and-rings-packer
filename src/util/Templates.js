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
 *   outputFor: WoodPredicate<T>;
 *   targetFor: WoodPredicate<T>;
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
    const outFile = T.outputFor(wood);
    execSync(`cp ${Ctx.WORK_DIR}/templates/${T.baseFile} ${outFile}`);

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
      targetFor: (wood) => wood.logBlock,
    }),
  },

  Fusion: {
    LOG: use({
      baseFile: "variants.png.mcmeta",
      outputFor: (wood) => `${wood.texturesDir}/${wood.logAsset}.png.mcmeta`,
      targetFor: () => null,
    }),

    WOOD: use({
      baseFile: "variants.png.mcmeta",
      outputFor: (wood) => `${wood.texturesDir}/${wood.woodAsset}.png.mcmeta`,
      targetFor: () => null,
    }),

    TOP: use({
      baseFile: "top.png.mcmeta",
      outputFor: (wood) => `${wood.texturesDir}/${wood.logAsset}_top.png.mcmeta`,
      targetFor: (wood) => wood.logBlock,
    }),
  }
};
