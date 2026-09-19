import { Dir, Packs } from "@const/Directories";
import { SIDES_TO_TOP_IDX } from "@const/LogSides";
import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { LOGGER } from "@util/Logger";
import looksSame from "looks-same";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { extname } from "node:path";

const MODELLED_TOPS = Object.values(SIDES_TO_TOP_IDX);

/** @param {string[]} args */
function cleanArgs(args = []) {
  return args
    .filter((arg) => arg?.length)
    .map((arg) => arg.trim())
    .join(" ");
}

/** @param {string} color */
function bg(color) {
  return `-background ${color}`;
}

function border({ color = "transparent", x = 0, y = 0 }) {
  const borderOpts = [`-bordercolor ${color}`];

  if (x > 0 && y > 0) borderOpts.push(`-border ${x}x${y}`);
  else if (y > 0) borderOpts.push(`-border 0x${y}`);
  else if (x > 0) borderOpts.push(`-border ${x}x0`);

  return borderOpts.join(" ");
}

function tile({ rows = 0, cols = 0 }) {
  if (!rows && !cols) return "";
  if (!rows) return `-tile ${cols}x`;
  if (!cols) return `-tile x${rows}`;
  return `-tile ${cols}x${rows}`;
}

function geo({ w = 16, h = 16, size = 0 }) {
  if (size) return `-geometry ${size}x${size}`;
  if (w && h) return `-geometry ${w}x${h}`;
  return "";
}

function scene(start = 0) {
  return `-scene ${start}`;
}

function copy(file = "", count = 1) {
  if (file && count) return `${file} -duplicate ${count - 1}`;
  return "";
}

function pngs(...numFiles) {
  return numFiles
    .map((num) => (num === null ? "null:" : `${num}.png`))
    .join(" ");
}

/**
 * @param {Parameters<typeof execSync>[1]} cmdOpts
 * @param {string} spriteSheet
 * @param {...string} opts
 */
function split(cmdOpts, spriteSheet, ...opts) {
  if (!spriteSheet) return;

  const args = cleanArgs([
    spriteSheet,
    "-crop 16x16",
    "+repage",
    "-strip",
    ...opts,
    "%d.png",
  ]);

  execSync(`convert ${args}`, cmdOpts);
}

/**
 * @param {Parameters<typeof execSync>[1]} cmdOpts
 * @param {string} spriteFiles
 * @param {string} outputFile
 * @param {...string} opts
 */
function join(cmdOpts, spriteFiles, outputFile, ...opts) {
  if (!spriteFiles || !outputFile) return;

  const args = cleanArgs([
    spriteFiles,
    ...opts,
    "-background none",
    outputFile,
  ]);

  execSync(`montage ${args}`, cmdOpts);
}

/**
 * @param {Parameters<typeof execSync>[1]} cmdOpts
 * @param {string} spriteFile
 * @param {string} outputFile
 * @param {string} cropOpts
 * @param {...string} opts
 */
function crop(cmdOpts, spriteFile, outputFile, cropOpts, ...opts) {
  if (!spriteFile || !outputFile) return;

  const args = cleanArgs([
    spriteFile,
    `-crop ${cropOpts}`,
    "+repage",
    ...opts,
    outputFile,
  ]);

  execSync(`convert ${args}`, cmdOpts);
}

/**
 * @param {Parameters<typeof execSync>[1]} cmdOpts
 * @param {string} spriteFile
 * @param {string} outputFile
 * @param {...string} opts
 */
function conv(cmdOpts, spriteFile, outputFile, ...opts) {
  if (!spriteFile || !outputFile) return;

  const args = cleanArgs([spriteFile, ...opts, outputFile]);
  execSync(`convert ${args}`, cmdOpts);
}

const FusionRemaps = {
  CTM_FULL: {
    Third: {
      TOP: "top_third.png",
      MIDDLE: "middle_third.png",
      BOTTOM: "bottom_third.png",
    },

    Sprites: {
      TOP: "[0-7].png 1[2-9].png",
      MIDDLE: `2[4-7].png ${pngs(30, 31, 28, 29)} 3[6-9].png ${pngs(42, 43, 40, 41)}`,
      BOTTOM: `${pngs(34, 46, 23, 22, 9, 21, 32, 33, 35, 47, 11, 10, 8, 20, 44, 45)}`,

      THIRDS() {
        return Object.values(FusionRemaps.CTM_FULL.Third).join(" ");
      },
    },

    MergeOpts: {
      PART: [tile({ cols: 8 }), geo({ size: 16 })],
      FINAL: [tile({ rows: 3 }), geo({ w: 128, h: 32 })],
    },
  },

  VARIANTS: {
    Sprites: [
      copy("0.png", 50),
      copy("1.png", 20),
      copy("2.png", 5),
      copy("3.png", 5),
      copy("4.png", 5),
      copy("5.png", 5),
      copy("6.png", 5),
      copy("7.png", 5),
      "8.png",
      "9.png",
      "10.png",
      "11.png",
      "12.png",
    ].join(" "),

    MergeOpts: [tile({ cols: 15 }), geo({ size: 16 })],
  },

  LOG_EDGES: {
    Sprites: pngs(0, null, 0, 2, null, 0, 1, 0, 1, null, 1, 2, null, 2, 1, 2),
    MergeOpts: [tile({ cols: 4 }), geo({ size: 16 })],
  },

  WOOD_EDGES: {
    Sprites: pngs(0, null, 12, 3, 2, 24, 1, 36, 6, 7, 4, 5, 18, 19, 16, 17),
    MergeOpts: [tile({ cols: 4 }), geo({ size: 16 })],
  },
};

const SaplingRemaps = {
  /** @type {{ file: string; pngIdx: number }[]} */
  TilesSM: [
    { file: "decaying_sprout", pngIdx: 32 },
    { file: "decaying_sprout2", pngIdx: 41 },
    { file: "decaying_sprout3", pngIdx: 50 },
    { file: "sprout", pngIdx: 4 },
    { file: "sprout2", pngIdx: 13 },
    { file: "sprout3", pngIdx: 22 },
    { file: "sapling", pngIdx: 5 },
    { file: "sapling2", pngIdx: 14 },
    { file: "sapling3", pngIdx: 23 },
    { file: "leaves_overhang", pngIdx: 31 },
    { file: "leaves_overhang2", pngIdx: 40 },
    { file: "roots", pngIdx: 8 },
    { file: "roots2", pngIdx: 17 },
    { file: "roots3", pngIdx: 26 },
  ],

  /** @type {{ file: string; pngs: string }[]} */
  TilesLG: [
    { file: "sapling_branches", pngs: pngs(0, 1, 9, 10) },
    { file: "sapling_branches2", pngs: pngs(18, 19, 27, 28) },
    { file: "sapling_branches3", pngs: pngs(36, 37, 45, 46) },
    { file: "sapling_leaves", pngs: pngs(2, 3, 11, 12) },
    { file: "sapling_leaves2", pngs: pngs(20, 21, 29, 30) },
    { file: "sapling_leaves3", pngs: pngs(38, 39, 47, 48) },
    { file: "roots_large", pngs: pngs(6, 7, 15, 16) },
    { file: "roots2_large", pngs: pngs(24, 25, 33, 34) },
    { file: "roots3_large", pngs: pngs(42, 43, 51, 52) },
  ],

  MergeOpts: [tile({ cols: 2 }), geo({ size: 16 })],
};

const SeedlingRemaps = {
  /** @type {{ file: string; pngIdx: number }[]} */
  TILES: [
    { file: "seedling", pngIdx: 35 },
    { file: "seedling2", pngIdx: 44 },
    { file: "seedling3", pngIdx: 53 },
  ],
};

export const SpriteMaker = {
  COMMON: {
    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    updateLogSideSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);
      const woodTextures = `${wood.textures()}/block`;

      const customSides = WoodTypes.hasCustomSides(wood);

      /** @type {{ [k in keyof LogFaceMapping]: number }} */
      const idxMapping = {
        SM: customSides ? 0 : 24,
        LEFT: customSides ? 1 : 25,
        CORE: customSides ? 2 : 47,
        RIGHT: customSides ? 3 : 27,
      };

      const sideSprites = customSides ? Dir.SIDE_SPRITES : Dir.TOP_SPRITES;
      const spriteType = customSides ? "sides" : "tops";
      if (!splitSprites(tmpDir, wood, sideSprites)) {
        LOGGER.warn(`Spritesheet (${spriteType}) for '${wood.id}' not found`);
        return;
      }

      const logFaces = wood.logFaces();
      Object.entries(idxMapping)
        .map(([side, idx]) => ({
          src: `${tmpDir}/${idx}.png`,
          dst: `${woodTextures}/${logFaces[side]}.png`,
        }))
        .forEach(({ src, dst }) => execSync(`cp ${src} ${dst}`));

      if (addDefaultSprite(tmpDir, wood)) {
        execSync(`mv ${tmpDir}/0.png ${woodTextures}/${wood.logAsset}.png`);
      }
    },

    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async updateTopSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      if (!splitSprites(tmpDir, wood)) return;
      execSync(`rm -f ${tmpDir}/47.png`);

      for (let idx = 0; idx < 47; idx++) {
        if (MODELLED_TOPS.includes(idx)) continue;
        execSync(`rm -f ${tmpDir}/${idx}.png`);
      }

      const logTop = wood.logFaces().TOP;
      execSync(`mv ${tmpDir}/0.png ${tmpDir}/${logTop}.png`);

      await orderTextures(tmpDir, logTop, wood);
    },
  },

  CTM: {
    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async updateVariantSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSprites(spritesPath, wood, Ctx.NEW_WOODS)) return;

      const original = `${spritesPath}/${wood.typeAsset}.png`;
      split({ cwd: tmpDir }, original, scene(1));

      await filterChangedSprites(tmpDir, Dir.CTM.variants(wood));
    },
  },

  FUSION: {
    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    updateVariantSprites(tmpDir, wood) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSprites(spritesPath, wood, Ctx.NEW_WOODS)) return;

      const original = `${spritesPath}/${wood.typeAsset}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      const outFile = `${wood.logAsset}.png`;
      const outPath = `${tmpDir}/${outFile}`;

      const { Sprites, MergeOpts } = FusionRemaps.VARIANTS;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync("mkdir -p out/ && mv *.png out/", { cwd: tmpDir });
    },

    /** @param {string} tmpDir */
    async updateWoodEdgeSprites(tmpDir) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.EDGE_SPRITES}`;
      split({ cwd: tmpDir }, `${spritesPath}/edges-wood.png`, scene(0));

      const { Sprites, Third, MergeOpts } = FusionRemaps.CTM_FULL;
      join({ cwd: tmpDir }, Sprites.TOP, Third.TOP, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.MIDDLE, Third.MIDDLE, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.BOTTOM, Third.BOTTOM, ...MergeOpts.PART);

      const outFile = "wood_edges.png";
      const outPath = `${tmpDir}/${outFile}`;
      const destDir = `${Dir.textures(Packs.FUSION)}/block`;
      join({ cwd: tmpDir }, Sprites.THIRDS(), outPath, ...MergeOpts.FINAL);

      cleanDir({ cwd: tmpDir }, outFile);
      await filterChangedSprites(tmpDir, destDir, (file) => file === outFile);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async collectNewAssets(tmpDir, wood) {
      if (!existsSync(`${tmpDir}/out`)) return;

      execSync("mv out/* .", { cwd: tmpDir });
      const woodTextures = `${wood.textures(Packs.FUSION)}/block`;

      /** @type {typeof isPNG} */
      const isDefaultSprite = (file) => file === `${wood.logAsset}.png`;

      /** @type {typeof isPNG} */
      const mask = (file) => isPNG(file) && isDefaultSprite(file);
      await filterChangedSprites(tmpDir, woodTextures, mask);
    },
  },

  SAPLINGS: {
    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async updateSaplingSprites(tmpDir, wood) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.SAPLING_SPRITES}`;
      if (!hasSprites(spritesPath, wood, Ctx.NEW_SAPLINGS)) return;

      execSync("mkdir -p saplings_out", { cwd: tmpDir });
      execSync("mkdir -p seedlings_out", { cwd: tmpDir });
      split({ cwd: tmpDir }, `${spritesPath}/${wood.typeAsset}.png`, scene(0));

      const { TilesSM, TilesLG, MergeOpts } = SaplingRemaps;
      const SAPLING_OUTPUTS = [
        ...TilesSM.map(({ file, pngIdx }) => {
          const src = `${pngIdx}.png`;
          const dest = `saplings_out/${wood.type}_${file}.png`;
          execSync(`mv ${tmpDir}/${src} ${tmpDir}/${dest}`);
          return dest;
        }),

        ...TilesLG.map(({ file, pngs }) => {
          const dest = `saplings_out/${wood.type}_${file}.png`;
          join({ cwd: tmpDir }, pngs, dest, ...MergeOpts);
          return dest;
        }),
      ];

      const SEEDLING_OUTPUTS = SeedlingRemaps.TILES.map(({ file, pngIdx }) => {
        const src = `${pngIdx}.png`;
        const dest = `seedlings_out/${wood.type}_${file}.png`;
        execSync(`mv ${tmpDir}/${src} ${tmpDir}/${dest}`);
        return dest;
      });

      const woodTextures = `${wood.textures(Packs.SAPLINGS)}/block`;
      const modTextures = `${Dir.MOD.textures(Packs.SAPLINGS)}/block`;

      /** @type {typeof isPNG} */
      let mask = (file) => isPNG(file) && SAPLING_OUTPUTS.includes(file);
      await filterChangedSprites(`${tmpDir}/saplings_out`, woodTextures, mask);

      mask = (file) => isPNG(file) && SEEDLING_OUTPUTS.includes(file);
      await filterChangedSprites(`${tmpDir}/seedlings_out`, modTextures, mask);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async updateStemSideSprite(tmpDir, wood) {
      clearPNGs(tmpDir);

      const barkSpritesPath = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_SPRITES}`;
      if (!hasSprites(barkSpritesPath, wood, Ctx.NEW_SAPLINGS)) return;

      const topSpritesPath = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_TOP_SPRITES}`;
      if (!hasSprites(topSpritesPath, wood, Ctx.NEW_SAPLINGS)) return;

      const defaultBark = `${barkSpritesPath}/${wood.typeAsset}.png`;
      const defaultTop = `${topSpritesPath}/${wood.typeAsset}.png`;
      const woodTextures = `${wood.textures(Packs.SAPLINGS)}/block`;
      const outFile = `${wood.type}_stem_sides.png`;

      crop({ cwd: tmpDir }, defaultBark, "bark.png", "3x12+0+2");
      crop({ cwd: tmpDir }, defaultTop, "inside.png", "3x12+0+2");

      const joinOpts = [tile({ cols: 2 }), geo({ w: 3, h: 12 })];
      join({ cwd: tmpDir }, pngs("bark", "inside"), "joined.png", ...joinOpts);

      // prettier-ignore
      const convOpts = [bg("none"), "-gravity east", "-splice 10x0", border({ y: 2 })];
      conv({ cwd: tmpDir }, "joined.png", outFile, ...convOpts);
      cleanDir({ cwd: tmpDir }, outFile);

      /** @type {typeof isPNG} */
      const mask = (file) => file === outFile && isPNG(file);
      await filterChangedSprites(tmpDir, woodTextures, mask);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodDef} wood
     */
    async updateSeedSprites(tmpDir, wood) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.SEED_SPRITES}`;
      if (!hasSprites(spritesPath, wood, Ctx.NEW_SAPLINGS)) return;

      const woodTextures = `${Dir.MOD.textures(Packs.SAPLINGS)}/item`;
      const outFile = `${woodTextures}/${wood.seedAsset()}.png`;

      execSync(`cp ${spritesPath}/${wood.typeAsset}.png ${outFile}`);
    },
  },
};

/**
 * @param {string} dir
 * @param {WoodDef} wood
 * @param {object} mapping
 */
function hasSprites(dir, wood, mapping) {
  const filePath = `${dir}/${wood.typeAsset}.png`;
  const exists = existsSync(filePath);

  if (exists) return true;

  if (mapping?.[wood.id]) {
    mapping = { ...mapping, [wood.id]: false };
  }

  return false;
}

/**
 * @param {string} dir
 * @param {WoodDef} wood
 */
function addDefaultSprite(dir, wood) {
  const defaultSprite = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_SPRITES}/${wood.typeAsset}.png`;
  if (!existsSync(defaultSprite)) return false;

  execSync(`cp ${defaultSprite} ${dir}/0.png`);
  return true;
}

/** @param {Parameters<typeof execSync>[1]} cmdOpts */
function cleanDir(cmdOpts, file) {
  execSync(`find . -maxdepth 1 -type f -not -name ${file} -delete`, cmdOpts);
}

function clearPNGs(dir) {
  execSync(`rm -f ${dir}/*.png`);
}

/**
 * @param {string} tmpDir
 * @param {WoodDef} wood
 * @param {string} spritesDir
 */
function splitSprites(tmpDir, wood, spritesDir = Dir.TOP_SPRITES) {
  const spritesPath = `${Ctx.DOWNLOADS}/${spritesDir}`;
  if (!hasSprites(spritesPath, wood, Ctx.NEW_WOODS)) return false;

  const original = `${spritesPath}/${wood.typeAsset}.png`;
  split({ cwd: tmpDir }, original, scene(0));

  return true;
}

/**
 * @param {string} tmpDir
 * @param {string} baseTexture
 * @param {WoodDef} wood
 */
async function orderTextures(tmpDir, baseTexture, wood, pack = Packs.DEFAULT) {
  execSync(`for f in [0-9]*.png ; do mv -- "$f" "${baseTexture}_$f" ; done`, {
    cwd: tmpDir,
  });

  /** @type {typeof isPNG} */
  const mask = (file) => isPNG(file) && file.startsWith(`${baseTexture}_`);

  await filterChangedSprites(tmpDir, wood.textures(pack), mask);
}

async function filterChangedSprites(tmpDir, destDir, mask = isPNG) {
  execSync(`mkdir -p ${destDir}`);

  const existingSprites = readdirSync(`${destDir}`);
  const tmpSprites = readdirSync(`${tmpDir}`);

  const cleanDest = (sprite) => {
    if (tmpSprites.includes(sprite)) return;
    execSync(`rm ${destDir}/${sprite}`);
  };

  existingSprites
    .filter((file) => mask(file))
    .forEach((sprite) => cleanDest(sprite));

  for (const sprite of tmpSprites) {
    if (!isPNG(sprite)) continue;

    const tmpSprite = `${tmpDir}/${sprite}`;
    const oldPath = `${destDir}/${sprite}`;

    const replace = () => execSync(`cp ${tmpSprite} ${oldPath}`);
    const optimize = () => execSync(`optipng -o7 -quiet ${oldPath}`);

    if (existingSprites.includes(sprite)) {
      const { equal } = await looksSame(tmpSprite, oldPath);
      if (equal) continue;
    }

    replace();
    optimize();
  }
}

/** @param {string} file */
function isPNG(file) {
  return extname(file) === ".png";
}
