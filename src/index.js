import { Ctx } from "@const/RunContext";
import { Zip } from "@const/ZipInfo";
import { Common } from "@methods/Common";
import { CTM } from "@methods/CTM";
import { Fusion } from "@methods/Fusion";
import { LOGGER } from "@util/Logger";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

const THIS_FILE = "index.js";

/**
 * @template {Arg} T
 * @typedef {T["values"][number]} ArgValues
 */

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

/**
 * @typedef {ArgValues<typeof METHOD>} MethodValues
 * @satisfies {Arg}
 */
const METHOD = /** @type {const} */ ({
  name: "METHOD",
  optional: true,
  default: "common",
  values: ["common", "ctm", "fusion"],
});

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
 * @param {MethodValues} method
 */
function updateWood(woodType, method = "common") {
  if (!woodType) LOGGER.errOfferHelp("Wood type must be provided");

  switch (method) {
    case "common":
      Common.updateWood(Wood.baseAssets(woodType));
      break;

    case "ctm":
      CTM.updateWood(Wood.assetsCTM(woodType));
      break;

    case "fusion":
      Fusion.updateWood(Wood.assetsFusion(woodType));
      break;
  }
}

/** @param {MethodValues} method */
function updateAll(method = "common") {
  switch (method) {
    case "common":
      return Common.updateAll();

    case "ctm":
      return CTM.updateAll();

    case "fusion":
      return Fusion.updateAll();
  }
}

/** @param {MethodValues} method */
function rezip(method = "common") {
  /** @type {ZipInfo} */
  let zipInfo;

  switch (method) {
    case "common":
      zipInfo = Zip.Common;
      break;

    case "ctm":
      zipInfo = Zip.CTM;
      break;

    case "fusion":
      zipInfo = Zip.Fusion;
      break;
  }

  const { packName, include, exclude, mcMeta } = zipInfo;

  let contents = [...include, "pack.png"].join(" ");
  if (exclude instanceof Array) {
    contents = `${contents} -x ${exclude.join(" ")}`;
  }

  execSync(`zip -9qr ${packName} ${contents}`, { cwd: Ctx.WORK_DIR });

  if (mcMeta) {
    execSync(`cp ${mcMeta} pack.mcmeta`, { cwd: Ctx.WORK_DIR });
    execSync(`zip -9qm ${packName} pack.mcmeta`, { cwd: Ctx.WORK_DIR });
  }

  console.log("Resource Pack re-zipped!\n");
}

init();
