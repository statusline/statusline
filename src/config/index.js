const fs = require("fs");
const path = require("path");

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

const WATCH_DEBOUNCE = 50;

const config = {
	default: DEFAULT_CONFIG,

	/**
	 * Calls back whenever the config file changes.
	 *
	 * The watch is re-established after a rename, because most editors save by
	 * writing a new file and moving it over the old one; the watch would
	 * otherwise be left holding a file that nothing writes to again.
	 *
	 * Changes are debounced, since one save often arrives as several events.
	 *
	 * @param {Function} onChange Called after the config file settles
	 * @returns {Function} Call to stop watching
	 */
	watch: function(onChange){
		let watcher = null;
		let timer = null;

		const start = function(){
			try {
				watcher = fs.watch(paths.configFile, handle);

				watcher.unref();
			} catch(_err) {
				watcher = null;
			}
		};

		const handle = function(eventType){
			clearTimeout(timer);

			timer = setTimeout(() => {
				if(eventType === "rename"){
					if(watcher){
						watcher.close();
					}

					start();
				}

				onChange();
			}, WATCH_DEBOUNCE);
		};

		start();

		return function(){
			clearTimeout(timer);

			if(watcher){
				watcher.close();
			}
		};
	},

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
			fs.mkdirSync(path.dirname(paths.configFile), {recursive: true});

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
