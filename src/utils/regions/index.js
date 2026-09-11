const LEFT = "left";
const CENTER = "center";
const RIGHT = "right";

const ORDER = [LEFT, CENTER, RIGHT];
const DEFAULT_REGION = LEFT;

/**
 * Splits rendered output into the three regions of a bar.
 *
 * Blocks keep the order they have in the config within their region, and a
 * block that does not name a region lands in the default one, so a config
 * written before regions existed renders exactly as it did.
 *
 * @param {Object[]} output Rendered blocks
 * @returns {{left: Object[], center: Object[], right: Object[]}} Grouped output
 */
const group = function(output){
	return output.reduce((grouped, block) => {
		const region = ORDER.indexOf(block.region) === -1 ? DEFAULT_REGION : block.region;

		return Object.assign({}, grouped, {
			[region]: grouped[region].concat([block])
		});
	}, {
		left: [],
		center: [],
		right: []
	});
};

/**
 * Works out the column each region starts at.
 *
 * The centre is placed against the true middle of the line and then nudged
 * aside if it would collide with either side, so a long window title pushes
 * into the empty space instead of overwriting its neighbours. When everything
 * together is wider than the line, the regions are simply butted against one
 * another and the bar is left to clip.
 *
 * @param {{left: number, center: number, right: number}} widths Visible widths
 * @param {number} columns Total width available
 * @returns {{left: number, center: number, right: number}} Zero based offsets
 */
const positions = function(widths, columns){
	const total = widths.left + widths.center + widths.right;

	if(total >= columns){
		return {
			left: 0,
			center: widths.left,
			right: widths.left + widths.center
		};
	}

	if(widths.center === 0){
		return {
			left: 0,
			center: widths.left,
			right: columns - widths.right
		};
	}

	const ideal = Math.round((columns - widths.center) / 2);

	const center = Math.max(widths.left, Math.min(ideal, columns - widths.right - widths.center));

	return {
		left: 0,
		center: center,
		right: columns - widths.right
	};
};

/**
 * Lays three rendered strings out across a fixed width.
 *
 * @param {{left: string, center: string, right: string}} parts Rendered regions
 * @param {{left: number, center: number, right: number}} widths Visible widths
 * @param {number} columns Total width available
 * @returns {string} One line, padded with spaces
 */
const layout = function(parts, widths, columns){
	const offsets = positions(widths, columns);

	const beforeCenter = " ".repeat(Math.max(0, offsets.center - widths.left));
	const beforeRight = " ".repeat(Math.max(0, offsets.right - offsets.center - widths.center));

	return parts.left + beforeCenter + parts.center + beforeRight + parts.right;
};

module.exports = {
	left: LEFT,
	center: CENTER,
	right: RIGHT,
	order: ORDER,
	defaultRegion: DEFAULT_REGION,
	group: group,
	positions: positions,
	layout: layout
};
