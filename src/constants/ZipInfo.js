import { Dir } from "@const/Directories";

const mcModels = Dir.models();
const mcTextures = Dir.textures();

/** @satisfies {{ [k: string]: ZipInfo }} */
export const Zip = /** @type {const} */ ({
  Common: {
    packName: "pack-standalone.zip",
    include: ["assets/*/blockstates", "assets/*/models", "assets/*/textures"],
    exclude: [
      `${mcModels}/block/wood_edges.json`,
      `${mcTextures}/block/wood_edges.*`,
    ],
    mcMeta: "default.pack.mcmeta",
  },

  CTM: {
    packName: "pack-standalone-ctm.zip",
    include: ["assets/minecraft/optifine"],
    mcMeta: "default.pack.mcmeta",
  },

  Fusion: {
    packName: "pack-standalone-fusion.zip",
    include: [
      "assets/minecraft/fusion",
      `${mcModels}/block/wood_edges.json`,
      `${mcTextures}/block/wood_edges.*`,
    ],
    mcMeta: "fusion.pack.mcmeta",
  },
});
