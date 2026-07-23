import { Dir, Namespace } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { SpriteType } from "@const/SpriteTypes";
import { LOGGER } from "@util/Logger";
import { WoodFacts } from "@util/Wood";
import looksSame from "looks-same";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { extname } from "node:path";

const { TOPS, VARIANT } = SpriteType;

/** @param {string[]} args */
function cleanArgs(args = []) {
  return args
    .filter((arg) => arg?.length)
    .map((arg) => arg.trim())
    .join(" ");
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

export const SpriteMaker = {
  COMMON: {
    /**
     * @param {string} tmpDir
     * @param {BaseWoodAssets} wood
     */
    updateLogSideSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      if (!splitTopSprites(tmpDir, wood)) {
        LOGGER.warn(`Spritesheet (${TOPS}) for '${wood.id}' not found`);
        return;
      }

      const logSides = wood.logFaces();
      execSync(`cp ${tmpDir}/24.png ${wood.texturesDir}/${logSides.SM}.png`);
      execSync(`cp ${tmpDir}/25.png ${wood.texturesDir}/${logSides.LEFT}.png`);
      execSync(`cp ${tmpDir}/47.png ${wood.texturesDir}/${logSides.CORE}.png`);
      execSync(`cp ${tmpDir}/27.png ${wood.texturesDir}/${logSides.RIGHT}.png`);
    },

    /**
     * @param {string} tmpDir
     * @param {BaseWoodAssets} wood
     */
    async updateTopSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      if (!splitTopSprites(tmpDir, wood)) return;
      execSync(`rm -f ${tmpDir}/47.png`);

      await orderTextures(tmpDir, wood.logFaces().TOP, wood);
    },

    /**
     * @param {string} tmpDir
     * @param {BaseWoodAssets} wood
     */
    async updateVariantSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSpritesheet(spritesPath, wood)) {
        LOGGER.warn(`Spritesheet (${VARIANT}) for '${wood.id}' not found`);
        return;
      }

      const original = `${spritesPath}/${wood.assetPath}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      await orderTextures(tmpDir, wood.bark(), wood);
      execSync(`mv ${wood.bark()}_0.png ${wood.logAsset}.png`, {
        cwd: wood.texturesDir,
      });
    },
  },

  CTM: {
    /**
     * @param {string} tmpDir
     * @param {WoodAssetsCTM} wood
     */
    async updateTopSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      if (!splitTopSprites(tmpDir, wood)) return;
      execSync(`rm -f ${tmpDir}/47.png`);

      await filterChangedSprites(tmpDir, wood.topsDir);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsCTM} wood
     */
    async updateVariantSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSpritesheet(spritesPath, wood)) return;

      const original = `${spritesPath}/${wood.assetPath}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      await filterChangedSprites(tmpDir, wood.variantsDir);
    },
  },

  Fusion: {
    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    updateTopSprites(tmpDir, wood) {
      clearPNGs(tmpDir);

      if (!splitTopSprites(tmpDir, wood)) return;

      const { Sprites, Third, MergeOpts } = FusionRemaps.CTM_FULL;
      join({ cwd: tmpDir }, Sprites.TOP, Third.TOP, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.MIDDLE, Third.MIDDLE, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.BOTTOM, Third.BOTTOM, ...MergeOpts.PART);

      const outFile = `${wood.logAsset}_top.png`;
      const outPath = `${tmpDir}/${outFile}`;
      join({ cwd: tmpDir }, Sprites.THIRDS(), outPath, ...MergeOpts.FINAL);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync(`mkdir -p out/ && mv *.png out/`, { cwd: tmpDir });
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    updateVariantSprites(tmpDir, wood) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSpritesheet(spritesPath, wood)) return;

      const original = `${spritesPath}/${wood.assetPath}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      const outFile = `${wood.logAsset}.png`;
      const outPath = `${tmpDir}/${outFile}`;

      const { Sprites, MergeOpts } = FusionRemaps.VARIANTS;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync(`cp ${outFile} ${wood.woodAsset}.png`, { cwd: tmpDir });
      execSync(`mkdir -p out/ && mv *.png out/`, { cwd: tmpDir });
    },

    /** @param {string} tmpDir */
    async updateLogEdgeSprites(tmpDir) {
      clearPNGs(tmpDir);

      // TODO: nonexistent path
      const edgesDirCTM = `${Ctx.WORK_DIR}/${Dir.CTM.ROOT}/_overlays/edges/live_logs/logs_vertical`;
      execSync(`cp [0-2].png ${tmpDir}/`, { cwd: edgesDirCTM });

      const outFile = "log_edges.png";
      const outPath = `${tmpDir}/${outFile}`;
      const destDir = `${Ctx.WORK_DIR}/${Dir.textures()}/block`;

      const { Sprites, MergeOpts } = FusionRemaps.LOG_EDGES;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      await filterChangedSprites(tmpDir, destDir, (file) => file === outFile);
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
      const destDir = `${Ctx.WORK_DIR}/${Dir.textures()}/block`;
      join({ cwd: tmpDir }, Sprites.THIRDS(), outPath, ...MergeOpts.FINAL);

      cleanDir({ cwd: tmpDir }, outFile);
      await filterChangedSprites(tmpDir, destDir, (file) => file === outFile);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    async collectNewAssets(tmpDir, wood) {
      if (!existsSync(`${tmpDir}/out`)) return;

      execSync(`mv out/* .`, { cwd: tmpDir });

      /** @type {typeof isPNG} */
      const mask = (file) => isPNG(file) && file.startsWith(wood.type);

      await filterChangedSprites(tmpDir, wood.texturesDir, mask);
    },
  },
};

/**
 * @param {string} dir
 * @param {string} spriteType
 * @param {WoodAssetsFusion} wood
 */
function hasSpritesheet(dir, wood) {
  const filePath = `${dir}/${wood.assetPath}.png`;
  const exists = existsSync(filePath);

  if (exists) return true;

  if (Ctx.NEW_WOODS?.[wood.id]) {
    Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.id]: false };
  }

  return false;
}

/**
 * @param {string} dir
 * @param {BaseWoodAssets} wood
 */
function addDefaultSprite(dir, wood) {
  const defaultSprite = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_SPRITES}/${wood.assetPath}.png`;
  execSync(`cp ${defaultSprite} ${dir}/0.png`);
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
 * @param {BaseWoodAssets} wood
 */
function splitTopSprites(tmpDir, wood) {
  const spritesPath = `${Ctx.DOWNLOADS}/${Dir.TOP_SPRITES}`;
  if (!hasSpritesheet(spritesPath, wood)) return false;

  const original = `${spritesPath}/${wood.assetPath}.png`;
  split({ cwd: tmpDir }, original, scene(0));

  return true;
}

/**
 * @param {string} tmpDir
 * @param {string} baseTexture
 * @param {BaseWoodAssets} wood
 */
async function orderTextures(tmpDir, baseTexture, wood) {
  execSync(`for f in *.png ; do mv -- "$f" "${baseTexture}_$f" ; done`, {
    cwd: tmpDir,
  });

  /** @type {typeof isPNG} */
  const mask = (file) => isPNG(file) && file.startsWith(`${baseTexture}_`);

  await filterChangedSprites(tmpDir, wood.texturesDir, mask);
}

async function filterChangedSprites(tmpDir, destDir, mask = isPNG) {
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
