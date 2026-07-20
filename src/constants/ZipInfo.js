export const Zip = {
  CTM: {
    PACK_NAME: "pack-standalone-ctm.zip",
    SRC: [
      "assets/minecraft/optifine",
      "assets/*/blockstates",
      "assets/*/models/block/*side*.json",
      "assets/*/models/block/*top_*.json",
      "assets/*/models/block/template_*.json",
      "assets/*/textures/block/*side*.png",
      "assets/*/textures/block/*top_*.png",
    ],
    MCMETA: "ctm.pack.mcmeta",
  },

  Fusion: {
    PACK_NAME: "pack-standalone-fusion.zip",
    SRC: [
      "assets/minecraft/fusion",
      "assets/*/blockstates",
      "assets/*/models",
      "assets/*/textures",
    ],
    MCMETA: "fusion.pack.mcmeta",
  },
};
