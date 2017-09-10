#!/usr/bin/env node

const cli = require("./src/cli");

const commands = {
	"i3status": {
		run: require("./src/commands/i3status"),
		description: "i3status application"
	}
}

cli(commands);

