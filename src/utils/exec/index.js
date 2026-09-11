const execFile = require("child_process").execFile;
const spawn = require("child_process").spawn;

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

/**
 * Runs a long lived command and calls back for each line it prints.
 *
 * For event sources such as pactl subscribe, which sit there and report changes
 * as they happen rather than answering a question and exiting.
 *
 * The child is detached from the event loop, so it never keeps a one shot
 * command alive, and it is killed when the returned function is called.
 *
 * @param {string} command Binary to run, resolved through PATH
 * @param {string[]} args Arguments passed to the binary
 * @param {Function} onLine Called with each line of stdout
 * @returns {Function} Call to stop the command
 */
const stream = function(command, args, onLine){
	let child;

	try {
		child = spawn(command, args, {stdio: ["ignore", "pipe", "ignore"]});
	} catch(_err) {
		return function(){};
	}

	let pending = "";

	child.stdout.on("data", (chunk) => {
		const lines = (pending + chunk).split("\n");

		pending = lines.pop();

		lines.forEach(onLine);
	});

	child.on("error", () => {
		pending = "";
	});

	child.unref();
	child.stdout.unref();

	return function(){
		child.kill();
	};
};

module.exports = {
	run: run,
	stream: stream
};
