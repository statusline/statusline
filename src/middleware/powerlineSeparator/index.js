const icons = require("../../utils/icons");

const SEPARATOR = icons.powerline.right;
const DEFAULT_BACKGROUND = "#000000";

/**
 * Inserts powerline arrows between blocks.
 *
 * Each arrow is drawn in the background colour of the block on its left, over
 * the background colour of the block on its right, which is what makes the
 * colours appear to flow into one another.
 *
 * options:
 *   separator - glyph to draw, defaults to the powerline arrow
 *   trailing  - also draw an arrow after the last block
 */
module.exports = {
	apply: function(output, options = {}){
		const separator = options.separator || SEPARATOR;

		if(output.length === 0){
			return output;
		}

		const withSeparators = output.reduce((rendered, block, index) => {
			const next = output[index + 1];

			if(!next){
				return rendered.concat([block]);
			}

			const arrow = {
				name: "separator" + index,
				markup: "none",
				full_text: separator,
				color: block.background || DEFAULT_BACKGROUND,
				background: next.background || DEFAULT_BACKGROUND,
				separator: false,
				separator_block_width: 0
			};

			return rendered.concat([block, arrow]);
		}, []);

		if(!options.trailing){
			return withSeparators;
		}

		const last = output[output.length - 1];

		return withSeparators.concat([{
			name: "separatorEnd",
			markup: "none",
			full_text: separator,
			color: last.background || DEFAULT_BACKGROUND,
			separator: false,
			separator_block_width: 0
		}]);
	}
};
