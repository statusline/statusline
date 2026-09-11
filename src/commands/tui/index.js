const status = require("../../status");
const ansi = require("../../utils/ansi");

const DEFAULT_INTERVAL = 1000;
const CTRL_C = String.fromCharCode(3);
const QUIT_KEYS = [CTRL_C, "q"];

/**
 * i3bar numbers mouse buttons 1 to 5; an SGR mouse report numbers the same
 * buttons 0, 1, 2, 64 and 65. Blocks are written against the i3bar numbering,
 * so reports are translated before being handed over.
 */
const BUTTONS = {
	0: 1,
	1: 2,
	2: 3,
	64: 4,
	65: 5
};

const MOUSE_REPORT = /\[<(\d+);(\d+);(\d+)([Mm])/g;

const tui = {
	ranges: [],

	/**
	 * Draws the status line in place, and records which columns belong to which
	 * block so a click can be routed back.
	 *
	 * Column widths are counted in characters. A double width glyph will shift
	 * the click target of the blocks after it by one column.
	 *
	 * @param {Object[]} output Rendered blocks
	 */
	draw: function(output){
		const visible = output.filter((block) => {
			return block.full_text !== "";
		});

		const line = visible.reduce((state, block) => {
			const text = block.full_text;

			const painted = ansi.color(block.background, true) + ansi.color(block.color, false) + text + ansi.reset;

			return {
				text: state.text + painted,
				column: state.column + text.length,
				ranges: state.ranges.concat([{
					start: state.column,
					end: state.column + text.length - 1,
					id: ("" + block.name).replace("block", "")
				}])
			};
		}, {
			text: "",
			column: 1,
			ranges: []
		});

		tui.ranges = line.ranges;

		process.stdout.write(ansi.clearLine + ansi.lineStart + line.text);
	},

	/**
	 * Finds the block occupying a column.
	 *
	 * The range is returned rather than just the id, so a click can be reported
	 * with its position inside the block. That is what lets a block like
	 * workspaces tell which of the numbers it drew was clicked.
	 *
	 * @param {number} column Terminal column, starting at 1
	 * @returns {?{id: string, start: number, end: number}} Range, or null
	 */
	blockAt: function(column){
		const found = tui.ranges.filter((range) => {
			return column >= range.start && column <= range.end;
		})[0];

		if(!found){
			return null;
		}

		return found;
	},

	/**
	 * Reads mouse reports and keypresses from the terminal.
	 */
	listen: function(){
		if(process.stdin.setRawMode){
			process.stdin.setRawMode(true);
		}

		process.stdin.resume();

		process.stdin.on("data", (chunk) => {
			const data = chunk + "";

			if(QUIT_KEYS.some((key) => {
				return data.indexOf(key) !== -1;
			})){
				tui.stop();

				return;
			}

			let report = MOUSE_REPORT.exec(data);

			while(report !== null){
				const button = BUTTONS[Number(report[1])];
				const column = Number(report[2]);
				const pressed = report[4] === "M";

				if(button && pressed){
					const found = tui.blockAt(column);

					if(found !== null){
						status.clickBlock(found.id, {
							name: "block" + found.id,
							button: button,
							x: column,
							relative_x: column - found.start,
							width: found.end - found.start + 1
						});
					}
				}

				report = MOUSE_REPORT.exec(data);
			}

			MOUSE_REPORT.lastIndex = 0;
		});
	},

	/**
	 * Puts the terminal back the way it was found.
	 */
	stop: function(){
		process.stdout.write(ansi.disableMouse + ansi.showCursor + "\n");

		if(process.stdin.setRawMode){
			process.stdin.setRawMode(false);
		}

		process.exit(0);
	},

	/**
	 * Runs the status line in the terminal, refreshing in place and responding
	 * to clicks.
	 *
	 * This is the same block and middleware pipeline the bar uses, which makes
	 * it the quickest way to see a config, and to check that a block you are
	 * writing handles its clicks.
	 *
	 * @param {string[]} args Command line arguments
	 * @returns {Promise} Resolves once the first frame has been drawn
	 */
	run: function(args = []){
		const intervalIndex = args.indexOf("--interval");
		const interval = intervalIndex === -1 ? DEFAULT_INTERVAL : Number(args[intervalIndex + 1]) || DEFAULT_INTERVAL;

		global.SILENT = true;

		process.stdout.write(ansi.hideCursor + ansi.enableMouse);

		process.on("SIGINT", tui.stop);
		process.on("SIGTERM", tui.stop);

		status.emitter.on("output", tui.draw);

		return status.init().then(() => {
			tui.listen();

			setInterval(() => {
				status.render();
			}, interval);

			return status.render();
		});
	}
};

module.exports = tui.run;
