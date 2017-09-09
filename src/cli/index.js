const console = require("../console");

module.exports = function(commands){
	commands["help"] = {
		run: function(){
			console.normal("Usage statusline command [args]");

			console.normal();

			console.normal("Commands: ");
			Object.keys(commands).forEach((key) => {
				console.normal("  ", key, "\t - ", commands[key].description);
			});
		},
		description: "This"
	};

	do {
		var command = process.argv.shift();
	} while(command != undefined && Object.keys(commands).indexOf(command) === -1);

	if(!command){
		console.error("Command not selected. ");
		command = "help";
	}

	commands[command].run(process.argv)
}

