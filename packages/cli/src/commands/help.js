module.exports = function help() {
  console.log(`
AWE - AI Workspace Enterprise

Commands:
  awe doctor
  awe list <skills|workflows|factories>
  awe search <keyword>
  awe install <package>
  awe installed
  awe remove <package>
  awe run factory <name> [--topic ...] [--out ...]
  awe registry list
  awe sprint
  awe help
`);
};
