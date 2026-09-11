const status = require("../../status");
const console = require("../../console");
const regions = require("../../utils/regions");
const markup = require("../../utils/markup");



const DEFAULT_INTERVAL = 1000;

/**
 * Wraps a block in a pango span carrying its colours.
 *
 * @param {Object} block Rendered block
 * @returns {string} Block text as pango markup
 */
const paint = function(block){
	const text = block.markup === "pango" ? block.full_text : markup.escape(block.full_text);

	const attributes = [];

	if(block.color){
		attributes.push("foreground=\"" + block.color + "\"");
	}

	if(block.background){
		attributes.push("background=\"" + block.background + "\"");
	}

	if(attributes.length === 0){
		return text;
	}

	return "<span " + attributes.join(" ") + ">" + text + "</span>";
};

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
 * A custom module is a single widget, so waybar's own CSS cannot reach the
 * blocks inside it. Colours are emitted as pango markup instead, which waybar
 * renders as long as the module does not set "escape": true. Pass --plain to
 * emit bare text and style the whole module from CSS instead.
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

	const blocksIndex = args.indexOf("--blocks");
	const only = blocksIndex === -1 ? null : (args[blocksIndex + 1] || "").split(",").filter(Boolean);

	const plain = args.indexOf("--plain") !== -1;

	status.emitter.on("output", (fullOutput) => {
		const output = region ? regions.group(fullOutput)[region] || [] : fullOutput;

		const visible = output.filter((block) => {
			return block.full_text !== "";
		});

		console.output(JSON.stringify({
			text: visible.map((block) => {
				if(plain){
					return markup.strip(block.full_text);
				}

				return paint(block);
			}).join(""),
			tooltip: visible.map((block) => {
				return block.instance + ": " + markup.strip(block.full_text).trim();
			}).join("\n"),
			class: "statusline"
		}));
	});

	status.setRegion(region);
	status.setBlocks(only);

	return status.init().then(() => {
		setInterval(() => {
			status.render();
		}, interval);

		return status.render();
	});
};
