import { Ctx } from "@const/RunContext";
import { CTM } from "@methods/CTM";
import { LOGGER } from "@util/Logger";
import { Wood } from "@util/Wood";
import { execSync } from "child_process";

const THIS_FILE = "index.js";
const PACK_NAME = "knots-and-rings-standalone.zip";

/**
 * @typedef {{
 *   cmds: string[];
 *   args: string[] | undefined;
 *   fn: Function;
 * }} Option
 *
 * @type {Option[]}
 */
export const ARG_OPTIONS = [
  {
    cmds: ["-h", "--help"],
    fn: () => LOGGER.options(),
  },
  {
    cmds: ["-u", "--update-log"],
    args: ["wood-type"],
    fn: (woodType) => {
      if (!woodType) LOGGER.errOfferHelp("Wood type must be provided");
      CTM.updateWood(Wood.assetsCTM(woodType));
    },
  },
  {
    cmds: ["-a", "--update-all"],
    fn: () => CTM.updateAll(),
  },
  {
    cmds: ["-z", "--rezip"],
    fn: () => rezip(),
  },
];

function init() {
  const [_np, filePath, cmd, ...args] = process.argv;
  if (!cmd) LOGGER.errUsage("wood-packer [option] [<args>]");

  [Ctx.WORK_DIR] = filePath.split("/src");
  if (!Ctx.WORK_DIR || !filePath.includes(THIS_FILE)) {
    LOGGER.errOfferHelp("Failed to parse variable 'WORKDIR'");
  }

  Ctx.DOWNLOADS = getShellConst("DOWNLOADS");
  if (!Ctx.DOWNLOADS || Ctx.DOWNLOADS === String(undefined)) {
    LOGGER.errOfferHelp("Shell variable 'DOWNLOADS' not defined");
  }

  Ctx.TEMPLATES_DIR = `${Ctx.WORK_DIR}/templates`;

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

function rezip() {
  execSync(`zip -9rq ${PACK_NAME} assets pack.*`, { cwd: Ctx.WORK_DIR });
  console.log("Resource Pack re-zipped!\n");
}

init();
