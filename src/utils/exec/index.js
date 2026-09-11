const execFile = require("child_process").execFile;

const DEFAULT_TIMEOUT = 2000;

/**
 * Runs a command and resolves with its trimmed stdout.
 *
 * Arguments are passed as a list and never through a shell, so a package name,
 * a workspace name or anything else coming from the config cannot turn into
 * shell syntax.
 *
 * Rejects when the binary is missing or exits non-zero, so callers can decide
 * what a failure means for their block.
 *
 * @param {string} command Binary to run, resolved through PATH
 * @param {string[]} args Arguments passed to the binary
 * @param {Object} [options] Passed to execFile; timeout defaults to 2 seconds
 * @returns {Promise<string>} Trimmed stdout
 */
const run = function(command, args = [], options = {}){
	const settings = Object.assign({
		timeout: DEFAULT_TIMEOUT
	}, options);

	return new Promise((resolve, reject) => {
		execFile(command, args, settings, (err, stdout, stderr) => {
			if(err){
				reject(new Error(command + " failed: " + (("" + stderr).trim() || err.message)));

				return;
			}

			resolve((stdout + "").trim());
		});
	});
};

module.exports = {
	run: run
};
