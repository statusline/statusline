const icons = require("../../utils/icons");

const SEPARATOR = icons.powerline.right;

/**
 * Draws a powerline separator glyph. Colours come from the block config.
 */
module.exports = {
	render: function(){
		return Promise.resolve({
			text: SEPARATOR
		});
	}
};
