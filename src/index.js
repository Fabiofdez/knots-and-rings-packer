import { Ctx } from "@const/RunContext";
import { WoodTypes } from "@const/WoodTypes";
import { Common } from "@methods/Common";
import { CTM } from "@methods/CTM";
import { Fusion } from "@methods/Fusion";
import { Saplings } from "@methods/Saplings";
import { LOGGER } from "@util/Logger";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

const THIS_FILE = "index.js";

/**
 * @template {Arg} T
 * @typedef {T["values"][number]} ArgValues
 *
 * @typedef {{
 *   cmds: string[];
 *   args?: (Arg | string)[];
 *   fn: Function;
 * }} Option
 *
 *
 * @typedef {ArgValues<typeof METHOD>} MethodValues
 * @satisfies {Arg}
 */
const METHOD = /** @type {const} */ ({
  name: "METHOD",
  optional: true,
  default: "common",
  values: ["common", "ctm", "fusion", "saplings"],
});

/** @satisfies {Arg} */
const WOOD_NAMESPACE = /** @type {const} */ ({
  name: "NAMESPACE",
  optional: true,
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
    args: [METHOD, WOOD_NAMESPACE],
    fn: (method, namespace) => updateAll(method, namespace),
  },
  // {
  //   cmds: ["-z", "--rezip"],
  //   args: [METHOD],
  //   fn: (method) => rezip(method),
  // },
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

  const wood = Wood.define(woodType);
  switch (method) {
    case "common":
      return Common.updateWood(wood);

    case "ctm":
      return CTM.updateWood(wood);

    case "fusion":
      return Fusion.updateWood(wood);

    case "saplings":
      return Saplings.updateForWood(wood);
  }
}

/**
 * @param {MethodValues} method
 * @param {string} namespace
 */
function updateAll(method = "common", namespace) {
  const woodSet = WoodTypes.resolveSet(namespace);

  if (!woodSet?.length) {
    LOGGER.errOfferHelp(`Unknown namespace '${namespace}'`);
  }

  switch (method) {
    case "common":
      return Common.updateAll(woodSet);

    case "ctm":
      return CTM.updateAll(woodSet);

    case "fusion":
      return Fusion.updateAll(woodSet);

    case "saplings":
      return Saplings.updateAll(woodSet);
  }
}

init();
