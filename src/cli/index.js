const console = require("../console");

module.exports = function(commands){
	do {
		var command = process.argv.shift();
	} while(command != undefined && Object.keys(commands).indexOf(command) === -1);

	if(!command){
		console.error("Command not selected. ");
		command = "help";
	}

	commands[command].run(process.argv)
}

