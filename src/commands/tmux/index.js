const status = require("../../status");
const console = require("../../console");

const DEFAULT_INTERVAL = 1000;

/**
 * Wraps a block in tmux colour syntax.
 *
 * @param {Object} block Rendered block
 * @returns {string} Block text with tmux style directives
 */
const paint = function(block){
	const parts = [];

	if(block.color){
		parts.push("fg=" + block.color);
	}

	if(block.background){
		parts.push("bg=" + block.background);
	}

	if(parts.length === 0){
		return block.full_text;
	}

	return "#[" + parts.join(",") + "]" + block.full_text + "#[default]";
};

/**
 * Renders the status line for a tmux status bar.
 *
 * tmux runs status-right on its own interval, so this prints once and exits.
 * Wire it up in tmux.conf with:
 *
 *   set -g status-right "#(statusline tmux)"
 *
 * @param {string[]} args Command line arguments
 * @returns {Promise} Resolves once the line has been printed
 */
module.exports = function(args = []){
	const watch = args.indexOf("--watch") !== -1 || args.indexOf("-w") !== -1;
	const plain = args.indexOf("--plain") !== -1;

	const intervalIndex = args.indexOf("--interval");
	const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

	global.SILENT = true;

	status.emitter.on("output", (output) => {
		console.output(output.filter((block) => {
			return block.full_text !== "";
		}).map((block) => {
			if(plain){
				return block.full_text;
			}

			return paint(block);
		}).join(""));
	});

	return status.init().then(() => {
		if(watch){
			setInterval(() => {
				status.render();
			}, interval);
		}

		return status.render();
	});
};
