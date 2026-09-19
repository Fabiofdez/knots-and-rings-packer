import { Dir, Packs } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { LOGGER } from "@util/Logger";
import { SpriteMaker } from "@util/SpriteMaker";
import { Templates } from "@util/Templates";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

export const Saplings = {
  /** @param {WoodDef} wood */
  markToUpdate(wood) {
    Ctx.NEW_SAPLINGS = { ...Ctx.NEW_SAPLINGS, [wood.id]: true };
  },

  /** @param {WoodDef} wood */
  updateForWood(wood) {
    this.markToUpdate(wood);

    execSync(`mkdir -p ${Dir.MOD.blockstates(Packs.SAPLINGS)}`);
    execSync(`mkdir -p ${Dir.MOD.models(Packs.SAPLINGS)}`);

    execSync(`mkdir -p ${wood.blockstates(Packs.SAPLINGS)}`);
    execSync(`mkdir -p ${wood.models(Packs.SAPLINGS)}`);

    Dir.makeTemp(`tmp/saplings/${wood.typeAsset}`, async (dir) => {
      await SpriteMaker.SAPLINGS.updateSaplingSprites(dir, wood);
      await SpriteMaker.SAPLINGS.updateStemSideSprite(dir, wood);
      SpriteMaker.SAPLINGS.updateSeedSprites(dir, wood);

      if (!Ctx.NEW_SAPLINGS?.[wood.id]) {
        execSync(`rm -rf ${dir}`);
        LOGGER.warn(`Failed to update sapling for '${wood.id}' wood type`);
        return;
      }

      Templates.BLOCKSTATES.SEED.defineFor(wood);
      Templates.ITEMS.SEED.defineFor(wood);

      if (wood.type !== "mangrove") {
        Templates.BLOCKSTATES.SAPLING.defineFor(wood);
        Templates.BLOCKSTATES.SAPLING_STEM.defineFor(wood);
      }

      Templates.MODELS.SAPLING.defineFor(wood);
      Templates.MODELS.SEEDLING.defineFor(wood);
      Templates.MODELS.SEED.defineFor(wood);
    });

    console.log(`...updated sapling for '${wood.id}' wood type`);
  },

  updateAll(woodSet = []) {
    console.log(`Updating saplings for all ${woodSet.length} wood types...`);

    const woodAssets = woodSet
      .map((wood) => Wood.define(wood))
      .filter((wood) => !wood.isStripped());

    for (const wood of woodAssets) {
      Saplings.updateForWood(wood);
    }
  },
};
