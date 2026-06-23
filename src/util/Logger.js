import { ARG_OPTIONS } from "@root";
import { exit } from "node:process";

function getOptions() {
  const opts = [];

  for (const opt of ARG_OPTIONS) {
    const cmds = (opt.cmds || []).join(", ");
    const args = (opt.args || []).join("> <");
    opts.push(`   ${cmds}  ${args.length ? `<${args}>` : ""}`);
  }
  return `Options: \n${opts.join("\n")}\n`;
}

export const LOGGER = {
  errOfferHelp(msg = "") {
    return this.err(`${msg.trim()} (type -h, --help for options)`);
  },

  errUsage(msg = "") {
    console.error(`usage: ${msg} \n\n${getOptions()}`);
    exit(1);
  },

  err(msg = "") {
    console.error(`ERROR: ${msg}\n`);
    exit(1);
  },

  warn(msg = "") {
    console.log(`WARNING: ${msg}\n`);
  },

  options() {
    console.log(getOptions());
  },
};
