const status = require("../../status");
const console = require("../../console");
const regions = require("../../utils/regions");

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
 * tmux runs its status on its own interval, so this prints once and exits.
 * Wire it up in tmux.conf with:
 *
 *   set -g status-right "#(statusline tmux --region right)"
 *   set -g status-left "#(statusline tmux --region left)"
 *
 * tmux has a separate option per side rather than one line, so --region picks
 * which one to print. Without it every region is printed in order.
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

	const regionIndex = args.indexOf("--region");
	const region = regionIndex === -1 ? null : args[regionIndex + 1];

	status.emitter.on("output", (fullOutput) => {
		const output = region ? regions.group(fullOutput)[region] || [] : fullOutput;

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
