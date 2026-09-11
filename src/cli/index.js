const console = require("../console");
const paths = require("../paths");

const CONFIG_FLAG = "--config";
const CONFIG_ENV = "STATUSLINE_CONFIG";

/**
 * Applies --config, or the STATUSLINE_CONFIG environment variable, and removes
 * the flag from the arguments so commands never see it.
 *
 * @param {string[]} args Arguments to read the flag from
 * @returns {string[]} The arguments without the flag and its value
 */
const selectConfig = function(args){
	const index = args.indexOf(CONFIG_FLAG);

	if(index === -1){
		if(process.env[CONFIG_ENV]){
			paths.useConfig(process.env[CONFIG_ENV]);
		}

		return args;
	}

	const value = args[index + 1];

	if(!value){
		console.error(CONFIG_FLAG + " needs a config name or a path. ");

		return args.slice(0, index);
	}

	paths.useConfig(value);

	return args.slice(0, index).concat(args.slice(index + 2));
};

/**
 * Reads the command out of the arguments and runs it.
 *
 * @param {Object} commands Command table, keyed by command name
 */
module.exports = function(commands){
	commands["configs"] = {
		run: function(){
			const configs = paths.listConfigs();

			console.normal("Config directory: " + paths.configDirectory);
			console.normal();

			if(configs.length === 0){
				console.normal("No named configs. Create one with:");
				console.normal("  statusline --config work cli");

				return;
			}

			console.normal("Named configs: ");
			configs.forEach((name) => {
				console.normal("  " + name);
			});
		},
		description: "list named configs"
	};

	commands["help"] = {
		run: function(){
			console.normal("Usage: statusline [--config name] command [args]");
			console.normal();

			console.normal("Commands: ");
			Object.keys(commands).forEach((key) => {
				console.normal("  ", key, "\t - ", commands[key].description);
			});

			console.normal();
			console.normal("Config: " + paths.configFile);
		},
		description: "this"
	};

	const args = selectConfig(process.argv.slice(2));

	const index = args.findIndex((argument) => {
		return Object.keys(commands).indexOf(argument) !== -1;
	});

	if(index === -1){
		if(args.length > 0){
			console.error("Unknown command: " + args[0]);
		} else {
			console.error("Command not selected. ");
		}

		commands["help"].run([]);

		return;
	}

	commands[args[index]].run(args.slice(index + 1));
};
