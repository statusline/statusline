const path = require("path");

const homeDir = process.env["HOME"];

const paths = {
	configFile: path.join(homeDir, ".statusline.conf"),
	logFile: path.join(homeDir, ".statusline.log")
};

module.exports = paths;
