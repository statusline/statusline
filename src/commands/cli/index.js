const status = require("../../status");
const console = require("../../console");
const ansi = require("../../utils/ansi");
const regions = require("../../utils/regions");

const DEFAULT_INTERVAL = 1000;
const DEFAULT_COLUMNS = 80;

/**
 * Renders one region.
 *
 * @param {Object[]} blocks Rendered blocks of one region
 * @param {boolean} colored Whether to wrap blocks in ANSI colour escapes
 * @returns {{text: string, width: number}} Painted text and its visible width
 */
const paint = function(blocks, colored){
	const visible = blocks.filter((block) => {
		return block.full_text !== "";
	});

	return {
		text: visible.map((block) => {
			if(!colored){
				return block.full_text;
			}

			return ansi.color(block.background, true) + ansi.color(block.color, false) + block.full_text + ansi.reset;
		}).join(""),
		width: visible.reduce((width, block) => {
			return width + block.full_text.length;
		}, 0)
	};
};

/**
 * Renders the output as a single line of text.
 *
 * Regions are spread across the line when a width is known, and simply run into
 * one another when the output is a pipe with no width to spread across.
 *
 * @param {Object[]} output Rendered blocks
 * @param {boolean} colored Whether to wrap blocks in ANSI colour escapes
 * @param {?number} columns Width to lay the regions out across
 * @returns {string} One line, ready to print
 */
const format = function(output, colored, columns){
	const grouped = regions.group(output);

	const painted = {
		left: paint(grouped.left, colored),
		center: paint(grouped.center, colored),
		right: paint(grouped.right, colored)
	};

	const parts = {
		left: painted.left.text,
		center: painted.center.text,
		right: painted.right.text
	};

	if(!columns){
		return parts.left + parts.center + parts.right;
	}

	return regions.layout(parts, {
		left: painted.left.width,
		center: painted.center.width,
		right: painted.right.width
	}, columns);
};

const cli = {
	/**
	 * Prints the status line to stdout.
	 *
	 * Without arguments it prints one line and exits, which is what makes it
	 * usable from tmux, a shell prompt, a script, or just to see what your
	 * config looks like before wiring it into a bar.
	 *
	 * @param {string[]} args Command line arguments
	 * @returns {Promise} Resolves once the first line has been printed
	 */
	run: function(args = []){
		const watch = args.indexOf("--watch") !== -1 || args.indexOf("-w") !== -1;
		const plain = args.indexOf("--plain") !== -1;
		const colored = !plain && Boolean(process.stdout.isTTY);

		const widthIndex = args.indexOf("--width");

		let columns = null;

		if(widthIndex !== -1){
			columns = Number(args[widthIndex + 1]) || DEFAULT_COLUMNS;
		} else if(process.stdout.isTTY){
			columns = process.stdout.columns;
		}

		const intervalIndex = args.indexOf("--interval");
		const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

		status.emitter.on("output", (output) => {
			console.output(format(output, colored, columns));
		});

		return status.init().then(() => {
			if(watch){
				setInterval(() => {
					status.render();
				}, interval);
			}

			return status.render();
		});
	}
};

module.exports = cli.run;
