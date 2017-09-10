const path = require("path");

const homeDir = process.env["HOME"];

const paths = {
	configFile: path.join(homeDir, ".statusline.conf"),
	logFile: path.join(homeDir, ".statusline.log"),
	modulePath: path.join(homeDir, ".statusline_packages")
};

module.exports = paths;
