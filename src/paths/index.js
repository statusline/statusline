const path = require("path");
const fs = require("fs");

const homeDir = process.env["HOME"];
const configHome = process.env["XDG_CONFIG_HOME"] || path.join(homeDir, ".config");

const DEFAULT_CONFIG = path.join(homeDir, ".statusline.conf");
const CONFIG_DIRECTORY = path.join(configHome, "statusline");
const EXTENSION = ".conf";

const paths = {
	configFile: DEFAULT_CONFIG,
	defaultConfigFile: DEFAULT_CONFIG,
	configDirectory: CONFIG_DIRECTORY,
	logFile: path.join(homeDir, ".statusline.log"),
	modulePath: path.join(homeDir, ".statusline_packages"),

	/**
	 * Works out which file a --config value refers to.
	 *
	 * A value that looks like a path is taken as one, so a config can live
	 * anywhere; anything else is a name in the config directory. That is what
	 * makes "statusline --config laptop i3status" work.
	 *
	 * @param {string} nameOrPath Config name, or a path to a config file
	 * @returns {string} Absolute path to the config file
	 */
	resolveConfig: function(nameOrPath){
		if(nameOrPath.indexOf("/") !== -1 || nameOrPath.indexOf(".") === 0){
			return path.resolve(nameOrPath);
		}

		if(nameOrPath.slice(-EXTENSION.length) === EXTENSION){
			return path.join(CONFIG_DIRECTORY, nameOrPath);
		}

		return path.join(CONFIG_DIRECTORY, nameOrPath + EXTENSION);
	},

	/**
	 * Selects the config every later read and write will use.
	 *
	 * @param {string} nameOrPath Config name, or a path to a config file
	 * @returns {string} Absolute path to the selected config file
	 */
	useConfig: function(nameOrPath){
		paths.configFile = paths.resolveConfig(nameOrPath);

		return paths.configFile;
	},

	/**
	 * Lists the named configs that exist.
	 *
	 * @returns {string[]} Config names, without the extension
	 */
	listConfigs: function(){
		if(!fs.existsSync(CONFIG_DIRECTORY)){
			return [];
		}

		return fs.readdirSync(CONFIG_DIRECTORY).filter((entry) => {
			return entry.slice(-EXTENSION.length) === EXTENSION;
		}).map((entry) => {
			return entry.slice(0, -EXTENSION.length);
		}).sort();
	}
};

module.exports = paths;
