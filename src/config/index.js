const fs = require("fs");

const paths = require("../paths");
const schema = require("./schema");
const console = require("../console");

const DEFAULT_CONFIG = {
	blocks: [
		{
			name: "media",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "volume",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "network",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "temperature",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "cpu",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "memory",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "brightness",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "battery",
			color: "#ffffff",
			backgroundColor: "#000000"
		},
		{
			name: "date",
			color: "#ffffff",
			backgroundColor: "#000000"
		}
	]
};

const config = {
	default: DEFAULT_CONFIG,

	/**
	 * Loads the config, writing the default one on first run.
	 *
	 * A broken config never takes the bar down with it: the problem is reported
	 * and the default config is used instead, so you still have a status line to
	 * read the error on.
	 *
	 * @returns {Promise<Object>} Validated config
	 */
	loadConfig: function(){
		return config.exists().then((exists) => {
			if(!exists){
				return config.writeConfigFile(config.default).then(() => {
					console.success("Written default config to " + paths.configFile);

					return config.default;
				});
			}

			return config.loadConfigFile();
		}).then((loaded) => {
			const errors = schema.validate(loaded);

			if(errors.length === 0){
				return loaded;
			}

			console.error("Config at " + paths.configFile + " is not valid:");

			errors.forEach((error) => {
				console.error("  " + error);
			});

			console.error("Falling back to the default config. ");

			return config.default;
		}).catch((err) => {
			console.error("Could not read config at " + paths.configFile + ": " + err.message);
			console.error("Falling back to the default config. ");

			return config.default;
		});
	},

	/**
	 * Checks whether a config file exists.
	 *
	 * @returns {Promise<boolean>} True when the file is readable
	 */
	exists: () => {
		return new Promise((resolve) => {
			fs.access(paths.configFile, (err) => {
				resolve(!err);
			});
		});
	},

	/**
	 * Writes a config file.
	 *
	 * @param {Object} contents Config to serialise
	 * @returns {Promise} Resolves once written
	 */
	writeConfigFile: (contents) => {
		return new Promise((resolve, reject) => {
			fs.writeFile(paths.configFile, JSON.stringify(contents, null, 2), (err) => {
				if(err){
					reject(err);

					return;
				}

				resolve();
			});
		});
	},

	/**
	 * Reads and parses the config file.
	 *
	 * @returns {Promise<Object>} Parsed config
	 */
	loadConfigFile: () => {
		return new Promise((resolve, reject) => {
			fs.readFile(paths.configFile, "utf8", (err, data) => {
				if(err){
					reject(err);

					return;
				}

				try {
					resolve(JSON.parse(data));
				} catch(parseError) {
					reject(new Error("it is not valid JSON (" + parseError.message + ")"));
				}
			});
		});
	}
};

module.exports = config;
