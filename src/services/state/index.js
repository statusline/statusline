const fs = require("fs");
const path = require("path");

const paths = require("../../paths");

const WATCH_DEBOUNCE = 20;

/**
 * Remembers the little things a block decides at runtime.
 *
 * A block toggled by a click cannot keep that toggle in a variable: bars
 * without a click protocol run "statusline click" as a separate process, which
 * sets the value and exits, while the bar itself is a different process that
 * has to notice. So it goes in a file, and the file is watched.
 *
 * Only small values belong here. It is state, not a cache and not a config.
 */
let cache = null;

const state = {
	/**
	 * Reads the whole state file.
	 *
	 * @returns {Object} Stored values, empty when there is no usable file
	 */
	all: function(){
		if(cache !== null){
			return cache;
		}

		try {
			cache = JSON.parse(fs.readFileSync(paths.stateFile, "utf8"));
		} catch(_err) {
			cache = {};
		}

		return cache;
	},

	/**
	 * Reads one value.
	 *
	 * @param {string} key Value to read
	 * @param {*} [fallback] Returned when the key is not set
	 * @returns {*} The stored value, or the fallback
	 */
	get: function(key, fallback){
		const values = state.all();

		if(values[key] === undefined){
			return fallback;
		}

		return values[key];
	},

	/**
	 * Writes one value.
	 *
	 * @param {string} key Value to write
	 * @param {*} value What to store
	 */
	set: function(key, value){
		const values = Object.assign({}, state.all(), {
			[key]: value
		});

		cache = values;

		try {
			fs.mkdirSync(path.dirname(paths.stateFile), {recursive: true});
			fs.writeFileSync(paths.stateFile, JSON.stringify(values, null, 2) + "\n");
		} catch(_err) {
			cache = values;
		}
	},

	/**
	 * Calls back whenever another process changes the state.
	 *
	 * @param {Function} onChange Called after the state file settles
	 * @returns {Function} Call to stop watching
	 */
	subscribe: function(onChange){
		let watcher = null;
		let timer = null;

		const start = function(){
			try {
				fs.mkdirSync(path.dirname(paths.stateFile), {recursive: true});

				if(!fs.existsSync(paths.stateFile)){
					fs.writeFileSync(paths.stateFile, "{}\n");
				}

				watcher = fs.watch(paths.stateFile, handle);

				watcher.unref();
			} catch(_err) {
				watcher = null;
			}
		};

		const handle = function(eventType){
			clearTimeout(timer);

			timer = setTimeout(() => {
				cache = null;

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
	}
};

module.exports = state;
