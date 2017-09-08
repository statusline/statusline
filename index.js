#!/usr/bin/env node

const fs = require('fs');
const path = require("path");

const status = require("./src/i3status");
const config = require("./src/config");
const paths = require("./src/paths");

const log = function(line){
	fs.appendFile(paths.logFile, line+"\n", (err) => {});
}

fs.access(paths.configFile, (err) => {
	if (!err) {
		log("Loading existing config");

		return;
	} else {
		fs.writeFile(paths.configFile, JSON.stringify(config.default, null, 2), (err, fd) => {
			if (err) throw err;

			log("Loading default config");
		});
	}
});

status.addBlock();

setInterval(() => {
	status.render();
}, 1000);

