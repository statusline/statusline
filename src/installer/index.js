const npm = require("npm-programmatic");
const fs = require("fs");
const path = require("path");

const paths = require("../paths");
const console = require("../console");

const PREFIX = "statusline-";

if(!fs.existsSync(paths.modulePath)){
	fs.mkdirSync(paths.modulePath);

	fs.writeFileSync(path.join(paths.modulePath, "package.json"), "{}");
}

/**
 * Runs an npm operation against the directory blocks are installed into.
 *
 * @param {Function} operation npm-programmatic function to call
 * @param {string[]} names Package names, without the statusline- prefix
 * @param {string} present Verb used while working, e.g. "Installing"
 * @param {string} past Verb used when done, e.g. "Installed"
 * @returns {Promise} Resolves once every package has been handled
 */
const each = function(operation, names, present, past){
	const promises = names.map((name) => {
		const packageName = PREFIX + name;

		console.log(present + " " + packageName + "...");

		return operation([packageName], {
			cwd: paths.modulePath,
			save: true
		}).then(() => {
			console.success(past + " " + packageName);
		}).catch((err) => {
			console.error("Error while " + present.toLowerCase() + " " + packageName + ": " + err.message);

			return Promise.reject(err);
		});
	});

	return Promise.all(promises);
};

const installer = {
	/**
	 * Installs blocks or middleware from npm.
	 *
	 * @param {string[]} names Package names, without the statusline- prefix
	 * @returns {Promise} Resolves once every package is installed
	 */
	install: function(names){
		return each(npm.install, names, "Installing", "Installed").catch(() => {
			process.exitCode = 1;
		});
	},

	/**
	 * Removes blocks or middleware.
	 *
	 * @param {string[]} names Package names, without the statusline- prefix
	 * @returns {Promise} Resolves once every package is removed
	 */
	uninstall: function(names){
		return each(npm.uninstall, names, "Uninstalling", "Uninstalled").catch(() => {
			process.exitCode = 1;
		});
	}
};

module.exports = installer;
