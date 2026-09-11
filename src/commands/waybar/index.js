const status = require("../../status");
const console = require("../../console");

const DEFAULT_INTERVAL = 1000;

/**
 * Renders the status line as a waybar custom module.
 *
 * waybar reads one JSON object per line from a long running process, so this
 * keeps running and prints a line per render. Wire it up with:
 *
 *   "custom/statusline": {
 *     "exec": "statusline waybar",
 *     "return-type": "json"
 *   }
 *
 * @param {string[]} args Command line arguments
 * @returns {Promise} Resolves once the first line has been printed
 */
module.exports = function(args = []){
	const intervalIndex = args.indexOf("--interval");
	const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

	global.SILENT = true;

	status.emitter.on("output", (output) => {
		const visible = output.filter((block) => {
			return block.full_text !== "";
		});

		console.output(JSON.stringify({
			text: visible.map((block) => {
				return block.full_text;
			}).join(""),
			tooltip: visible.map((block) => {
				return block.instance + ":" + block.full_text.trim();
			}).join("\n"),
			class: "statusline"
		}));
	});

	return status.init().then(() => {
		setInterval(() => {
			status.render();
		}, interval);

		return status.render();
	});
};
