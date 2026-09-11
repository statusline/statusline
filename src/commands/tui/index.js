const status = require("../../status");
const ansi = require("../../utils/ansi");
const regions = require("../../utils/regions");

const DEFAULT_INTERVAL = 1000;
const DEFAULT_COLUMNS = 80;
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
	 * Paints one region, recording the column each block occupies within it.
	 *
	 * @param {Object[]} blocks Rendered blocks of one region
	 * @returns {{text: string, width: number, ranges: Object[]}} Painted region
	 */
	paint: function(blocks){
		return blocks.filter((block) => {
			return block.full_text !== "";
		}).reduce((state, block) => {
			const text = block.full_text;

			const painted = ansi.color(block.background, true) + ansi.color(block.color, false) + text + ansi.reset;

			return {
				text: state.text + painted,
				width: state.width + text.length,
				ranges: state.ranges.concat([{
					start: state.width,
					end: state.width + text.length - 1,
					id: ("" + block.name).replace("block", "")
				}])
			};
		}, {
			text: "",
			width: 0,
			ranges: []
		});
	},

	/**
	 * Draws the status line in place, and records which columns belong to which
	 * block so a click can be routed back.
	 *
	 * Each region is painted on its own and then shifted into place, because the
	 * padding between regions moves every block to its right. Recording the
	 * columns before padding would send clicks to the wrong block.
	 *
	 * Column widths are counted in characters. A double width glyph will shift
	 * the click target of the blocks after it by one column.
	 *
	 * @param {Object[]} output Rendered blocks
	 */
	draw: function(output){
		const columns = process.stdout.columns || DEFAULT_COLUMNS;

		const grouped = regions.group(output);

		const painted = {
			left: tui.paint(grouped.left),
			center: tui.paint(grouped.center),
			right: tui.paint(grouped.right)
		};

		const widths = {
			left: painted.left.width,
			center: painted.center.width,
			right: painted.right.width
		};

		const offsets = regions.positions(widths, columns);

		const line = regions.layout({
			left: painted.left.text,
			center: painted.center.text,
			right: painted.right.text
		}, widths, columns);

		tui.ranges = regions.order.reduce((ranges, region) => {
			return ranges.concat(painted[region].ranges.map((range) => {
				return {
					id: range.id,
					start: range.start + offsets[region] + 1,
					end: range.end + offsets[region] + 1
				};
			}));
		}, []);

		process.stdout.write(ansi.clearLine + ansi.lineStart + line);
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
