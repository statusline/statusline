#!/usr/bin/env node

const cli = require("./src/cli");

const commands = {
	"i3status": {
		run: require("./src/commands/i3status"),
		description: "i3status application"
	},
	"install": {
		run: require("./src/commands/install"),
		description: "block/middleware/command installer. "
	}
}

cli(commands);

