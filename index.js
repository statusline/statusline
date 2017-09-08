#!/usr/bin/env node

const console = require("./src/console");

const commands = {
	"start": {
		run: function(){
		
		},
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

do {
	var command = process.argv.shift();
} while(command != undefined && Object.keys(commands).indexOf(command) === -1);

if(!command){
	console.error("Command not selected. ");
	command = "help";
}

commands[command].run()

