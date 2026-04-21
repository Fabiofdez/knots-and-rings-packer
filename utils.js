import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { globSync } from "glob";
import looksSame from "looks-same";
import { extname } from "path";
import { exit } from "process";

const PACK_NAME = "knots-and-rings-standalone.zip";

/**
 * @typedef {{
 *   cmds: string[];
 *   args: string[] | undefined;
 *   fn: Function;
 * }} Option
 * @type {Option[]}
 */
const ARG_OPTIONS = [
  {
    cmds: ["-h", "--help"],
    fn: () => console.log(getOptions()),
  },
  {
    cmds: ["-u", "--update-log"],
    args: ["wood-type"],
    fn: (woodType) => {
      if (!woodType) errOfferHelp("Wood type must be provided");
      updateWood(woodType);
    },
  },
  {
    cmds: ["-a", "--update-all"],
    fn: () => updateAll(),
  },
  {
    cmds: ["-z", "--rezip"],
    fn: () => rezip(),
  },
];

const CTM_TEMPLATES = {
  log: "template_log.properties",
  wood: "template_wood.properties",
  top: "top.ctm.properties",
};

const EXISTING_WOOD_TYPES = [
  "acacia",
  "birch",
  "cherry",
  "dark_oak",
  "jungle",
  "mangrove",
  "oak",
  "pale_oak",
  "spruce",
  "stripped_acacia",
  "stripped_birch",
  "stripped_cherry",
  "stripped_dark_oak",
  "stripped_jungle",
  "stripped_mangrove",
  "stripped_oak",
  "stripped_pale_oak",
  "stripped_spruce",
];

const DIR = {
  ctm: "assets/minecraft/optifine/ctm",
  defaultSprites: "Knotted_Wood/sprite_defaults",
  variantSprites: "Knotted_Wood/spritesheet_variants",
  topSprites: "Knotted_Wood/spritesheet_tops",
};

let WORK_DIR = "";
let DOWNLOADS = "";
let TEMPLATES_DIR = "";

function init() {
  const [_np, filePath, cmd, ...args] = process.argv;

  if (!cmd) {
    errUsage("wood-packer [option] [<args>]");
    return;
  }

  [WORK_DIR] = filePath.split("/utils.js");
  DOWNLOADS = getShellConst("DOWNLOADS");

  if (!WORK_DIR || !filePath.includes("utils.js")) {
    errOfferHelp("Failed to parse variable 'WORKDIR'");
  }
  if (!DOWNLOADS) {
    errOfferHelp("Shell variable 'DOWNLOADS' not defined");
  }

  TEMPLATES_DIR = `${WORK_DIR}/templates`;

  const opt = ARG_OPTIONS.find((opt) => opt.cmds.includes(cmd));
  if (opt) {
    opt.fn(...args);
  } else {
    errOfferHelp(`Unknown command '${cmd}'`);
  }
}

function errOfferHelp(msg = "") {
  err(`${msg.trim()} (type -h, --help for options)`);
}

function errUsage(msg = "") {
  console.error(`usage: ${msg} \n\n${getOptions()}`);
  exit(1);
}

function err(msg = "") {
  console.error(`ERROR: ${msg}\n`);
  exit(1);
}
function warn(msg = "") {
  console.log(`WARNING: ${msg}\n`);
}

function getShellConst(varName) {
  return execSync(`echo \$${varName}`).toLocaleString().trim();
}

function getOptions() {
  const opts = [];

  for (const opt of ARG_OPTIONS) {
    const cmds = (opt.cmds || []).join(", ");
    const args = (opt.args || []).join("> <");
    opts.push(`   ${cmds}  ${args.length ? `<${args}>` : ""}`);
  }
  return `Options: \n${opts.join("\n")}\n`;
}

function rezip() {
  execSync(`cd ${WORK_DIR} && zip -9rq ${PACK_NAME} assets pack.*`);
  console.log("Resource Pack re-zipped!\n");
}

async function getDir(path = "") {
  let dirFound = false;
  let contents = [];

  await readdir(path)
    .then((res) => {
      dirFound = true;
      contents = res;
    })
    .catch((err) => {
      if (!err.path) throw err;
    });

  return {
    exists: dirFound,
    contents,
    path,
  };
}

/**
 * @typedef {ReturnType<typeof getAssetsFor>} WoodAssets
 * @param {string} woodType
 */
function getAssetsFor(woodType) {
  return {
    type: woodType,
    logBlock: `${woodType}_log`,
    woodBlock: `${woodType}_wood`,
    variantsDir: `${WORK_DIR}/${DIR.ctm}/${woodType}`,
    topsDir: `${WORK_DIR}/${DIR.ctm}/_overlays/${woodType}_log_top`,
  };
}

/** @param {WoodAssets} wood */
function isStripped(wood) {
  return wood.logBlock.startsWith("stripped_");
}

/** @param {WoodAssets} wood */
function isTrunk(wood) {
  return `${wood.logBlock}:is_trunk=true`;
}

/** @param {WoodAssets} wood */
async function updateWood(wood) {
  const variants = await getDir(wood.variantsDir);
  const tops = await getDir(wood.topsDir);

  if (!variants.exists && !tops.exists) {
    console.log(`Adding new '${wood.type}' wood type...`);
  }
  if (!variants.exists) execSync(`mkdir -p ${wood.variantsDir}`);
  if (!tops.exists) execSync(`mkdir -p ${wood.topsDir}`);

  await updateProperties(wood);
  updateAllSprites(wood);
}

/** @param {WoodAssets} wood */
async function updateProperties(wood) {
  const logVariants = `${wood.variantsDir}/log.properties`;
  const woodVariants = `${wood.variantsDir}/wood.properties`;
  const logTops = `${wood.topsDir}/ctm.properties`;

  await updatePropsFor(CTM_TEMPLATES.log, logVariants, wood.logBlock);
  await updatePropsFor(CTM_TEMPLATES.wood, woodVariants, wood.woodBlock);
  await updatePropsFor(CTM_TEMPLATES.top, logTops, isTrunk(wood));
}

/**
 * @param {string} template
 * @param {string} outfile
 * @param {string} targetBlock
 */
async function updatePropsFor(template, outfile, targetBlock) {
  execSync(`cp ${TEMPLATES_DIR}/${template} ${outfile}`);

  return readFile(outfile)
    .then((buf) => buf.toLocaleString())
    .then((props) => props.replace(/TEMPLATE_BLOCK/g, targetBlock))
    .then((updated) => writeFileSync(outfile, updated));
}

/** @param {WoodAssets[]} woodAssets */
function updateCtmOverlays(woodAssets) {
  const ctmOverlaysDir = `${WORK_DIR}/${DIR.ctm}/_overlays`;
  const ctmEdgesProps = globSync(`${ctmOverlaysDir}/edges/*/*.ctm.properties`);

  /** @type {{ [k: string]: (wood: WoodAssets) => string }} */
  const blockStateTransform = {
    x: (wood) => `${wood.logBlock}:axis=x`,
    y: (wood) => `${wood.logBlock}:axis=y`,
    z_horizontal: (wood) => `${wood.logBlock}:axis=z`,
    z_vertical: (wood) => `${wood.logBlock}:axis=z`,
    wood: (wood) => wood.woodBlock,
  };

  for (const propsPath of ctmEdgesProps) {
    const propsFile = propsPath.split("/").pop();
    const [overlayType] = propsFile.split(".");

    const matchBlocks = woodAssets
      .map(blockStateTransform[overlayType])
      .filter((block) => block?.length > 0);

    const otherProps = readFileSync(propsPath)
      .toLocaleString()
      .split("\n")
      .filter((line) => !line.startsWith("matchBlocks"));

    const updatedProps = [
      "matchBlocks=" + [...new Set(matchBlocks)].sort().join(" "),
      ...otherProps,
    ];
    writeFileSync(propsPath, updatedProps.join("\n").trim() + "\n");
  }
}

/** @param {WoodAssets} wood */
async function updateAllSprites(wood) {
  const SpriteTypes = { VARIANT: true, TOPS: false };

  execSync(`mkdir -p ${WORK_DIR}/${wood.type}_tmp`);
  await updateSprites(wood, SpriteTypes.VARIANT);
  await updateSprites(wood, SpriteTypes.TOPS);

  execSync(`rm -r ${WORK_DIR}/${wood.type}_tmp`);
  console.log(`...updated '${wood.type}' wood type`);
}

/**
 * @param {WoodAssets} wood
 * @param {boolean} isVariantType
 */
async function updateSprites(wood, isVariantType = true) {
  const spritesheetDir = isVariantType ? DIR.variantSprites : DIR.topSprites;
  const blockSpriteDir = isVariantType ? wood.variantsDir : wood.topsDir;
  if (!blockSpriteDir) {
    err(`Failed to parse output directory for wood type '${wood.type}'`);
  }

  const type = isVariantType ? "variants" : "tops";
  const sceneStart = isVariantType ? 1 : 0;

  const spritesheets = await readdir(`${DOWNLOADS}/${spritesheetDir}`);
  if (!spritesheets.includes(`${wood.type}.png`)) {
    warn(`Spritesheet (${type}) for wood type '${wood.type}' not found`);
    return;
  }
  const path = `${DOWNLOADS}/${spritesheetDir}/${wood.type}.png`;
  const convertCmd = `convert ${path} -crop 16x16 +repage -scene ${sceneStart} %d.png`;

  execSync(`rm -rf ${WORK_DIR}/${wood.type}_tmp/*`);
  execSync(`cd ${WORK_DIR}/${wood.type}_tmp && ${convertCmd}`);

  if (isVariantType) {
    const defaultSprite = `${DOWNLOADS}/${DIR.defaultSprites}/${wood.type}.png`;
    execSync(`cp ${defaultSprite} ${WORK_DIR}/${wood.type}_tmp/0.png`);
  } else {
    execSync(`rm ${WORK_DIR}/${wood.type}_tmp/47.png`);
  }

  const tmpSprites = await readdir(`${WORK_DIR}/${wood.type}_tmp`);
  const existingSprites = await readdir(`${blockSpriteDir}`);

  existingSprites
    .filter((file) => extname(file) === ".png")
    .forEach((file) => {
      if (!tmpSprites.includes(file)) {
        execSync(`rm ${blockSpriteDir}/${file}`);
      }
    });

  for (const sprite of tmpSprites) {
    const tmpSpritePath = `${WORK_DIR}/${wood.type}_tmp/${sprite}`;
    const existingSpritePath = `${blockSpriteDir}/${sprite}`;
    const replace = () => execSync(`cp ${tmpSpritePath} ${existingSpritePath}`);

    if (!existingSprites.includes(sprite)) {
      replace();
    } else {
      const { equal } = await looksSame(tmpSpritePath, existingSpritePath);
      if (!equal) replace();
    }
  }

  execSync(`optipng -o7 -quiet ${blockSpriteDir}/*.png`);
}

async function updateAll() {
  console.log(`Updating all ${EXISTING_WOOD_TYPES.length} wood types...`);

  const woodAssets = EXISTING_WOOD_TYPES.map((w) => getAssetsFor(w));
  updateCtmOverlays(woodAssets);

  for (const wood of woodAssets) {
    await updateWood(wood);
  }
}

init();
