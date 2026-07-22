export const Zip = {
  CTM: {
    PACK_NAME: "pack-standalone-ctm.zip",
    SRC: [
      "assets/minecraft/optifine",
      "assets/*/blockstates",
      "assets/*/models/block/*bark*.json",
      "assets/*/models/block/*log*.json",
      "assets/*/models/block/log_edge_*.json",
      "assets/*/models/block/template_*.json",
      "assets/*/textures/block/*bark*.png",
      "assets/*/textures/block/*log*.png",
      "assets/*/textures/block/log_edge_*.png",
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
