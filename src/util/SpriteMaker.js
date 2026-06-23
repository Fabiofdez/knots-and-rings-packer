import { Dir } from "@const/Directories";
import { Ctx } from "@const/RunContext";
import { SpriteTypes } from "@const/SpriteTypes";
import { LOGGER } from "@util/Logger";
import looksSame from "looks-same";
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { extname } from "node:path";

/** @typedef {import("@util/Wood").WoodAssets} WoodAssets */

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

const Fusion = {
  Third: {
    TOP: "top_third.png",
    MIDDLE: "middle_third.png",
    BOTTOM: "bottom_third.png",
  },

  Sprites: {
    TOP: "[0-7].png 1[2-9].png",
    MIDDLE: "2[4-7].png {30,31,28,29}.png 3[6-9].png {42,43,40,41}.png",
    BOTTOM: "{34,46,23,22,9,21,32,33,35,47,11,10,8,20,44,45}.png",

    THIRDS() {
      return Object.values(Fusion.Third).join(" ");
    },
  },

  MergeOpts: {
    PART: [tile({ cols: 8 }), geo({ size: 16 })],
    FINAL: [tile({ rows: 3 }), geo({ w: 128, h: 32 })],
  },
};

export const SpriteMaker = {
  /**
   * @param {string} tmpDir
   * @param {WoodAssets} wood
   * @param {(typeof SpriteTypes)[keyof typeof SpriteTypes]} spriteType
   */
  async updateCtm(tmpDir, wood, spriteType) {
    const isVariantType = spriteType === SpriteTypes.VARIANT;

    const spritesDir = isVariantType ? Dir.VARIANT_SPRITES : Dir.TOP_SPRITES;
    const blockSpriteDir = isVariantType ? wood.variantsDir : wood.topsDir;
    if (!blockSpriteDir) {
      LOGGER.err(`Failed to parse output directory for '${wood.type}'`);
    }

    const spritesheets = readdirSync(`${Ctx.DOWNLOADS}/${spritesDir}`);
    if (!spritesheets.includes(`${wood.type}.png`)) {
      LOGGER.warn(`Spritesheet (${spriteType}) for '${wood.type}' not found`);
      return;
    }

    execSync(`rm -f ${tmpDir}/*`);

    const original = `${Ctx.DOWNLOADS}/${spritesDir}/${wood.type}.png`;
    split({ cwd: tmpDir }, original, scene(isVariantType ? 1 : 0));

    if (isVariantType) {
      const defaultSprite = `${Ctx.DOWNLOADS}/${Dir.DEFAULT_SPRITES}/${wood.type}.png`;
      execSync(`cp ${defaultSprite} ${tmpDir}/0.png`);
    } else {
      execSync(`rm -f ${tmpDir}/47.png`);
    }

    const existingSprites = readdirSync(`${blockSpriteDir}`);
    const tmpSprites = readdirSync(`${tmpDir}`);

    existingSprites
      .filter((file) => extname(file) === ".png")
      .forEach((file) => {
        if (!tmpSprites.includes(file)) {
          execSync(`rm ${blockSpriteDir}/${file}`);
        }
      });

    for (const sprite of tmpSprites) {
      const tmpPath = `${tmpDir}/${sprite}`;
      const existingPath = `${blockSpriteDir}/${sprite}`;
      const replace = () => execSync(`cp ${tmpPath} ${existingPath}`);
      const optimize = () => execSync(`optipng -o7 -quiet ${existingPath}`);

      if (existingSprites.includes(sprite)) {
        const { equal } = await looksSame(tmpPath, existingPath);
        if (equal) continue;
      }

      replace();
      optimize();
    }
  },

  /**
   * @param {string} tmpDir
   * @param {WoodAssets} wood
   */
  ctmToFusion(tmpDir, wood) {
    const { Sprites, Third, MergeOpts } = Fusion;

    const original = `${Ctx.DOWNLOADS}/${Dir.TOP_SPRITES}/${wood.type}.png`;
    const output = ""; // TODO: output to ???

    split({ cwd: tmpDir }, original, scene(0));

    join({ cwd: tmpDir }, Sprites.TOP, Third.TOP, ...MergeOpts.PART);
    join({ cwd: tmpDir }, Sprites.MIDDLE, Third.MIDDLE, ...MergeOpts.PART);
    join({ cwd: tmpDir }, Sprites.BOTTOM, Third.BOTTOM, ...MergeOpts.PART);

    join({ cwd: tmpDir }, Sprites.THIRDS(), output, ...MergeOpts.FINAL);
  },
};
