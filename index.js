#!/usr/bin/env node

const cli = require("./src/cli");
const console = require("./src/console");

const commands = {
	"start": {
		run: require("./src/commands/start"),
		description: "i3status application"
	},
	"help": {
		run: function(){
			console.normal("Usage: i3status command [args]");

			console.normal();

			console.normal("Commands: ");
			Object.keys(commands).forEach((key) => {
				console.normal("  ", key, "\t - ", commands[key].description);
			});
		},
		description: "This"
	}
};

cli(commands);

