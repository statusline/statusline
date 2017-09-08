const path = require("path");

const homeDir = process.env["HOME"];

const paths = {
	configFile: path.join(homeDir, ".i3statusjs.conf"),
	logFile: path.join(homeDir, ".i3statusjs.log")
};

module.exports = paths;
