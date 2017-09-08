#!/usr/bin/env node

const fs = require('fs');
const path = require("path");

const status = require("./i3status");
const defaultConfig = require("./defaultConfig");

const homeDir = process.env["HOME"];

const configFile = path.join(homeDir, ".i3statusjs.conf");
const logFile = path.join(homeDir, ".i3statusjs.log");

const log = function(line){
	fs.appendFile(logFile, line+"\n", (err) => {});
}

fs.access(configFile, (err) => {
	if (!err) {
		log("Loading existing config");

		return;
	} else {
		fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2), (err, fd) => {
			if (err) throw err;

			log("Loading default config");
		});
	}
});

status.addBlock();

setInterval(() => {
	status.render();
}, 1000);

