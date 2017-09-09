#!/usr/bin/env node

const cli = require("./src/cli");
const console = require("./src/console");

const commands = {
	"i3status": {
		run: require("./src/commands/i3status"),
		description: "i3status application"
	}
}

cli(commands);

