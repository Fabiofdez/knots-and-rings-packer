import { Ctx } from "@const/RunContext";
import { Zip } from "@const/ZipInfo";
import { CTM } from "@methods/CTM";
import { Fusion } from "@methods/Fusion";
import { LOGGER } from "@util/Logger";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

const THIS_FILE = "index.js";

/**
 * @typedef {{
 *   name: string;
 *   optional?: boolean;
 *   values?: string[];
 *   default: string;
 * }} Arg
 *
 *
 * @typedef {{
 *   cmds: string[];
 *   args?: (Arg | string)[];
 *   fn: Function;
 * }} Option
 */

/** @type {Arg} */
const METHOD = {
  name: "METHOD",
  optional: true,
  default: "ctm",
  values: ["ctm", "fusion"],
};

/** @type {Option[]} */
export const ARG_OPTIONS = [
  {
    cmds: ["-h", "--help"],
    fn: () => LOGGER.options(),
  },
  {
    cmds: ["-u", "--update-log"],
    args: ["WOOD_TYPE", METHOD],
    fn: (woodType, method) => updateWood(woodType, method),
  },
  {
    cmds: ["-a", "--update-all"],
    args: [METHOD],
    fn: (method) => updateAll(method),
  },
  {
    cmds: ["-z", "--rezip"],
    args: [METHOD],
    fn: (method) => rezip(method),
  },
];

function init() {
  const [_np, filePath, cmd, ...args] = process.argv;
  if (!cmd) LOGGER.errUsage("wood-packer [option] [<args>]");

  [Ctx.WORK_DIR] = filePath.split("/src");
  if (!Ctx.WORK_DIR || !filePath.includes(THIS_FILE)) {
    LOGGER.errOfferHelp("Failed to parse variable 'WORK_DIR'");
  }

  Ctx.DOWNLOADS = getShellConst("DOWNLOADS");
  if (!Ctx.DOWNLOADS || Ctx.DOWNLOADS === String(undefined)) {
    LOGGER.errOfferHelp("Shell variable 'DOWNLOADS' not defined");
  }

  const opt = ARG_OPTIONS.find((opt) => opt.cmds.includes(cmd));
  if (opt) {
    opt.fn(...args);
  } else {
    LOGGER.errOfferHelp(`Unknown command '${cmd}'`);
  }
}

function getShellConst(varName) {
  return execSync(`echo \$${varName}`).toLocaleString().trim();
}

/**
 * @param {string} woodType
 * @param {"ctm" | "fusion"} method
 */
function updateWood(woodType, method = "ctm") {
  if (!woodType) LOGGER.errOfferHelp("Wood type must be provided");

  if (method === "fusion") {
    Fusion.updateWood(Wood.assetsFusion(woodType));
  } else {
    CTM.updateWood(Wood.assetsCTM(woodType));
  }
}

function updateAll(method = "ctm") {
  if (method === "fusion") Fusion.updateAll();
  else CTM.updateAll();
}

/** @param {"ctm" | "fusion"} method */
function rezip(method = "ctm") {
  const zipInfo = method === "fusion" ? Zip.Fusion : Zip.CTM;
  const fileList = [...zipInfo.SRC, "pack.png"].join(" ");

  execSync(`cp ${zipInfo.MCMETA} pack.mcmeta`, { cwd: Ctx.WORK_DIR });
  execSync(`zip -9rq ${zipInfo.PACK_NAME} ${fileList}`, { cwd: Ctx.WORK_DIR });
  execSync(`zip -m ${zipInfo.PACK_NAME} pack.mcmeta`, { cwd: Ctx.WORK_DIR });

  console.log("Resource Pack re-zipped!\n");
}

init();
