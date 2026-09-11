const fs = require("fs");
const path = require("path");

const paths = require("../paths");
const exec = require("../utils/exec");
const console = require("../console");

const PREFIX = "statusline-";
const TIMEOUT = 120000;

/**
 * Makes sure the directory blocks are installed into exists.
 */
const prepare = function(){
	if(fs.existsSync(paths.modulePath)){
		return;
	}

	fs.mkdirSync(paths.modulePath);

	fs.writeFileSync(path.join(paths.modulePath, "package.json"), "{}\n");
};

/**
 * Runs an npm command against the directory blocks are installed into.
 *
 * npm is run directly rather than through a shell, so a package name cannot
 * carry shell syntax into the command.
 *
 * @param {string} operation npm subcommand, "install" or "uninstall"
 * @param {string[]} names Package names, without the statusline- prefix
 * @param {string} present Verb used while working, e.g. "Installing"
 * @param {string} past Verb used when done, e.g. "Installed"
 * @returns {Promise} Resolves once every package has been handled
 */
const each = function(operation, names, present, past){
	prepare();

	const promises = names.map((name) => {
		const packageName = PREFIX + name;

		console.log(present + " " + packageName + "...");

		return exec.run("npm", [operation, packageName, "--save", "--prefix", paths.modulePath], {
			cwd: paths.modulePath,
			timeout: TIMEOUT
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
		return each("install", names, "Installing", "Installed").catch(() => {
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
		return each("uninstall", names, "Uninstalling", "Uninstalled").catch(() => {
			process.exitCode = 1;
		});
	}
};

module.exports = installer;
