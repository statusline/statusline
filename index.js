#!/usr/bin/env node

const commands = {
	"start": true
};

do {
	var command = process.argv.shift();
} while(command != undefined && Object.keys(commands).indexOf(command) === -1);

if(!command){
	command = "help";
}

commands[command].run()

