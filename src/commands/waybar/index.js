const status = require("../../status");
const console = require("../../console");
const regions = require("../../utils/regions");

const DEFAULT_INTERVAL = 1000;

/**
 * Renders the status line as a waybar custom module.
 *
 * waybar reads one JSON object per line from a long running process, so this
 * keeps running and prints a line per render. Wire it up with:
 *
 *   "custom/statusline": {
 *     "exec": "statusline waybar --region right",
 *     "return-type": "json"
 *   }
 *
 * waybar places whole modules into its own left, center and right lists, so a
 * module can only ever be in one of them. --region picks which blocks this
 * module draws, which is how one config fills all three: run the command three
 * times, once per region. Without it every region is drawn in one module.
 *
 * @param {string[]} args Command line arguments
 * @returns {Promise} Resolves once the first line has been printed
 */
module.exports = function(args = []){
	const intervalIndex = args.indexOf("--interval");
	const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

	global.SILENT = true;

	const regionIndex = args.indexOf("--region");
	const region = regionIndex === -1 ? null : args[regionIndex + 1];

	status.emitter.on("output", (fullOutput) => {
		const output = region ? regions.group(fullOutput)[region] || [] : fullOutput;

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
