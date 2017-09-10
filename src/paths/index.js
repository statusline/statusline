const path = require("path");
const appModulePath = require('app-module-path');

const homeDir = process.env["HOME"];

const paths = {
	configFile: path.join(homeDir, ".statusline.conf"),
	logFile: path.join(homeDir, ".statusline.log"),
	modulePath: path.join(homeDir, ".statusline_packages")
};

appModulePath.addPath(path.join(paths.modulePath, "node_modules"));

module.exports = paths;
