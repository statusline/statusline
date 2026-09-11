const icons = require("../../utils/icons");

const ICON = icons.clock;
const DEFAULT_OPTIONS = {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false
};

/**
 * Shows the time.
 *
 * Defaults to 24 hour with seconds, which is what a bar clock is usually set to.
 *
 * customOptions:
 *   locale - BCP 47 locale tag, defaults to the system locale
 *   format - Intl.DateTimeFormat options, replacing the defaults
 *   icon   - set to false to show the time on its own
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const format = customOptions.format || DEFAULT_OPTIONS;

		const time = new Date().toLocaleTimeString(customOptions.locale, format);

		if(customOptions.icon === false){
			return Promise.resolve({
				text: " " + time + " "
			});
		}

		return Promise.resolve({
			text: " " + ICON + " " + time + " "
		});
	}
};
