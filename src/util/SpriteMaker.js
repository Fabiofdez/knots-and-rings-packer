import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { SpriteType } from "@const/SpriteTypes";
import { WoodTypes } from "@const/WoodTypes";
import { LOGGER } from "@util/Logger";
import { Wood } from "@util/Wood";
import looksSame from "looks-same";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { extname } from "node:path";

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
  TOP: {
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
        return Object.values(FusionRemaps.TOP.Third).join(" ");
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
  CTM: {
    /**
     * @param {string} tmpDir
     * @param {WoodAssetsCTM} wood
     */
    async updateTopSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.TOP_SPRITES}`;
      if (!hasSpritesheet(spritesPath, SpriteType.TOPS, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
      split({ cwd: tmpDir }, original, scene(0));
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
      if (!hasSpritesheet(spritesPath, SpriteType.VARIANT, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
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

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.TOP_SPRITES}`;
      if (!hasSpritesheet(spritesPath, SpriteType.TOPS, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
      split({ cwd: tmpDir }, original, scene(0));

      const { Sprites, Third, MergeOpts } = FusionRemaps.TOP;
      join({ cwd: tmpDir }, Sprites.TOP, Third.TOP, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.MIDDLE, Third.MIDDLE, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.BOTTOM, Third.BOTTOM, ...MergeOpts.PART);

      const outFile = `${wood.logBlock}_top.png`;
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
      if (!hasSpritesheet(spritesPath, SpriteType.VARIANT, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      const outFile = `${wood.logBlock}.png`;
      const outPath = `${tmpDir}/${outFile}`;

      const { Sprites, MergeOpts } = FusionRemaps.VARIANTS;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync(`cp ${outFile} ${wood.woodBlock}.png`, { cwd: tmpDir });
      execSync(`mkdir -p out/ && mv *.png out/`, { cwd: tmpDir });
    },

    /** @param {string} tmpDir */
    async updateLogEdgeSprites(tmpDir) {
      clearPNGs(tmpDir);

      const ctmDir = `${Ctx.WORK_DIR}/${Dir.MINECRAFT}/${Dir.CTM}`;
      const edgesDirCTM = `${ctmDir}/_overlays/edges/live_logs/logs_vertical`;
      execSync(`cp [0-2].png ${tmpDir}/`, { cwd: edgesDirCTM });

      const outFile = "log_edges.png";
      const outPath = `${tmpDir}/${outFile}`;
      const destDir = Wood.assetsFusion(WoodTypes.VANILLA[0]).texturesDir;

      const { Sprites, MergeOpts } = FusionRemaps.LOG_EDGES;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      await filterChangedSprites(tmpDir, destDir, (file) => file === outFile);
    },

    /** @param {string} tmpDir */
    async updateWoodEdgeSprites(tmpDir) {
      clearPNGs(tmpDir);

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.EDGE_SPRITES}`;
      const spritesheet = `${spritesPath}/edges-wood.png`;
      split({ cwd: tmpDir }, spritesheet, scene(0));

      const outFile = "wood_edges.png";
      const outPath = `${tmpDir}/${outFile}`;
      const destDir = Wood.assetsFusion(WoodTypes.VANILLA[0]).texturesDir;

      const { Sprites, MergeOpts } = FusionRemaps.WOOD_EDGES;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      await filterChangedSprites(tmpDir, destDir, (file) => file === outFile);
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    async collectNewAssets(tmpDir, wood) {
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
function hasSpritesheet(dir, spriteType, wood) {
  const filePath = `${dir}/${wood.type}.png`;
  const exists = existsSync(filePath);

  if (exists) return true;

  LOGGER.warn(`Spritesheet (${spriteType}) for '${wood.type}' not found`);
  if (Ctx.NEW_WOODS?.[wood.type]) {
    Ctx.NEW_WOODS = { ...Ctx.NEW_WOODS, [wood.type]: false };
  }

  return false;
}

/**
 * @param {string} dir
 * @param {BaseWoodAssets} wood
 */
function addDefaultSprite(dir, wood) {
  const defaultSprite = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_SPRITES}/${wood.type}.png`;
  execSync(`cp ${defaultSprite} ${dir}/0.png`);
}

/** @param {Parameters<typeof execSync>[1]} cmdOpts */
function cleanDir(cmdOpts, file) {
  execSync(`find . -maxdepth 1 -type f -not -name ${file} -delete`, cmdOpts);
}

function clearPNGs(dir) {
  execSync(`rm -f ${dir}/*.png`);
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
