const status = require("../../status");
const console = require("../../console");
const ansi = require("../../utils/ansi");

const DEFAULT_INTERVAL = 1000;

/**
 * Renders the output as a single line of text.
 *
 * @param {Object[]} output Rendered blocks
 * @param {boolean} colored Whether to wrap blocks in ANSI colour escapes
 * @returns {string} One line, ready to print
 */
const format = function(output, colored){
	return output.filter((block) => {
		return block.full_text !== "";
	}).map((block) => {
		if(!colored){
			return block.full_text;
		}

		return ansi.color(block.background, true) + ansi.color(block.color, false) + block.full_text + ansi.reset;
	}).join("");
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

		const intervalIndex = args.indexOf("--interval");
		const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

		status.emitter.on("output", (output) => {
			console.output(format(output, colored));
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
