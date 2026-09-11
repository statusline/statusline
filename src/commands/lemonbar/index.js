const status = require("../../status");
const console = require("../../console");

const DEFAULT_INTERVAL = 1000;

/**
 * Wraps a block in lemonbar formatting, which polybar also understands.
 *
 * @param {Object} block Rendered block
 * @returns {string} Block text with colour directives
 */
const paint = function(block){
	const foreground = block.color ? "%{F" + block.color + "}" : "";
	const background = block.background ? "%{B" + block.background + "}" : "";

	return foreground + background + block.full_text + "%{F-}%{B-}";
};

/**
 * Renders the status line for lemonbar or polybar.
 *
 * Both read a line at a time from stdin, so this keeps running and prints a
 * line per render. Wire it up with:
 *
 *   statusline lemonbar | lemonbar
 *
 * @param {string[]} args Command line arguments
 * @returns {Promise} Resolves once the first line has been printed
 */
module.exports = function(args = []){
	const intervalIndex = args.indexOf("--interval");
	const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

	global.SILENT = true;

	status.emitter.on("output", (output) => {
		console.output(output.filter((block) => {
			return block.full_text !== "";
		}).map(paint).join(""));
	});

	return status.init().then(() => {
		setInterval(() => {
			status.render();
		}, interval);

		return status.render();
	});
};
