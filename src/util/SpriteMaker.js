import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { SpriteType } from "@const/SpriteTypes";
import { LOGGER } from "@util/Logger";
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

function geo({ w = 0, h = 0, size = 0 }) {
  if (size) return `-geometry ${size}x${size}`;
  if (w && h) return `-geometry ${w}x${h}`;
  return "";
}

function scene(start = 0) {
  return `-scene ${start}`;
}

function copy(file = "", count = 1) {
  if (file && count) return new Array(count).fill(file);
  return [];
}

function pngs(...numFiles) {
  return numFiles.map((num) => `${num}.png`).join(" ");
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

const FusionTop = {
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
      return Object.values(FusionTop.Third).join(" ");
    },
  },

  MergeOpts: {
    PART: [tile({ cols: 8 }), geo({ size: 16 })],
    FINAL: [tile({ rows: 3 }), geo({ w: 128, h: 32 })],
  },
};

const FusionVariants = {
  Sprites: [
    ...copy("0.png", 50),
    ...copy("1.png", 20),
    ...copy("2.png", 5),
    ...copy("3.png", 5),
    ...copy("4.png", 5),
    ...copy("5.png", 5),
    ...copy("6.png", 5),
    ...copy("7.png", 5),
    "8.png",
    "9.png",
    "10.png",
    "11.png",
    "12.png",
  ].join(" "),

  MergeOpts: [tile({ cols: 15 }), geo({ size: 16 })],
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
      execSync(`rm -f ${tmpDir}/*`);
      const { Sprites, Third, MergeOpts } = FusionTop;

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.TOP_SPRITES}`;
      if (!hasSpritesheet(spritesPath, SpriteType.TOPS, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
      split({ cwd: tmpDir }, original, scene(0));

      join({ cwd: tmpDir }, Sprites.TOP, Third.TOP, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.MIDDLE, Third.MIDDLE, ...MergeOpts.PART);
      join({ cwd: tmpDir }, Sprites.BOTTOM, Third.BOTTOM, ...MergeOpts.PART);

      const outFile = `${wood.logBlock}_top.png`;
      const outPath = `${tmpDir}/${outFile}`;
      join({ cwd: tmpDir }, Sprites.THIRDS(), outPath, ...MergeOpts.FINAL);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync(`mkdir -p out/ && mv *.png *.mcmeta out/`, { cwd: tmpDir });
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    updateVariantSprites(tmpDir, wood) {
      execSync(`rm -f ${tmpDir}/*`);
      const { Sprites, MergeOpts } = FusionVariants;

      const spritesPath = `${Ctx.DOWNLOADS}/${Dir.VARIANT_SPRITES}`;
      if (!hasSpritesheet(spritesPath, SpriteType.VARIANT, wood)) return;

      const original = `${spritesPath}/${wood.type}.png`;
      split({ cwd: tmpDir }, original, scene(1));
      addDefaultSprite(tmpDir, wood);

      const outFile = `${wood.logBlock}.png`;
      const outPath = `${tmpDir}/${outFile}`;
      join({ cwd: tmpDir }, Sprites, outPath, ...MergeOpts);

      cleanDir({ cwd: tmpDir }, outFile);
      execSync(`cp ${outFile} ${wood.woodBlock}.png`, { cwd: tmpDir });
      execSync(`mkdir -p out/ && mv *.png *.mcmeta out/`, { cwd: tmpDir });
    },

    /**
     * @param {string} tmpDir
     * @param {WoodAssetsFusion} wood
     */
    async collectNewAssets(tmpDir, wood) {
      /** @type {typeof defaultMask} */
      const mask = (file) => file.startsWith(wood.type) && defaultMask(file);

      await filterChangedSprites(tmpDir, wood.topsDir, mask);
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

async function filterChangedSprites(tmpDir, destDir, mask = defaultMask) {
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
function defaultMask(file) {
  return extname(file) === ".png";
}
