const path = require("path");
const shell = require("shelljs");

const [pkg] = process.argv.slice(2);
if (!pkg) {
  console.log(`Usage node ./scripts/upgrade.js <pkg>`)
  process.exit();
}
const srcDir = path.resolve(__dirname, "../src");

shell.ls(srcDir).forEach(name => {
  shell.exec(`yarn add ${pkg}`, {cwd: path.resolve(srcDir, name)})
});
