#!/usr/bin/env node
const args = process.argv.slice(2);
const cmd = args[0];

// Command registry
const commands = {
  help: require("./commands/help.js"),
  doctor: require("./commands/doctor.js"),
  list: require("./commands/list.js"),
  search: require("./commands/search.js"),
  install: require("./commands/install.js"),
  installed: require("./commands/installed.js"),
  remove: require("./commands/remove.js"),
  run: require("./commands/run.js"),
  registry: require("./commands/registry-list.js"),
  sprint: require("./commands/sprint.js"),
};

if (!cmd || cmd === "help") {
  commands.help();
} else if (commands[cmd]) {
  // Pass remaining args to the command
  const commandArgs = args.slice(1);
  commands[cmd](...commandArgs);
} else {
  console.log(`Unknown command: ${cmd}`);
  console.log("Run 'awe help' for available commands.");
  process.exit(1);
}
