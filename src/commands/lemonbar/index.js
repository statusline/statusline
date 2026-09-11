const status = require("../../status");
const console = require("../../console");
const regions = require("../../utils/regions");
const markup = require("../../utils/markup");

const MARKERS = {
	left: "%{l}",
	center: "%{c}",
	right: "%{r}"
};

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

	return foreground + background + markup.strip(block.full_text) + "%{F-}%{B-}";
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
		const grouped = regions.group(output);

		console.output(regions.order.filter((region) => {
			return grouped[region].length > 0;
		}).map((region) => {
			return MARKERS[region] + grouped[region].filter((block) => {
				return block.full_text !== "";
			}).map(paint).join("");
		}).join(""));
	});

	return status.init().then(() => {
		setInterval(() => {
			status.render();
		}, interval);

		return status.render();
	});
};
