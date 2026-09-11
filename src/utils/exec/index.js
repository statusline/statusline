const execFile = require("child_process").execFile;

const DEFAULT_TIMEOUT = 2000;

/**
 * Runs a command and resolves with its trimmed stdout.
 *
 * Rejects when the binary is missing or exits non-zero, so callers can decide
 * what a failure means for their block.
 *
 * @param {string} command Binary to run, resolved through PATH
 * @param {string[]} args Arguments passed to the binary
 * @returns {Promise<string>} Trimmed stdout
 */
const run = function(command, args = []){
	return new Promise((resolve, reject) => {
		execFile(command, args, {timeout: DEFAULT_TIMEOUT}, (err, stdout) => {
			if(err){
				reject(err);

				return;
			}

			resolve((stdout+"").trim());
		});
	});
};

module.exports = {
	run: run
};
