const icons = require("../../utils/icons");

const DEFAULT_LOCALE = undefined;
const DEFAULT_OPTIONS = {
	weekday: "short",
	day: "numeric",
	month: "short"
};
const ICON = icons.date;

/**
 * Shows the current date, spelled out rather than as bare numbers.
 *
 * customOptions:
 *   locale  - BCP 47 locale tag, defaults to the system locale
 *   format  - Intl.DateTimeFormat options, replacing the defaults
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const locale = customOptions.locale || DEFAULT_LOCALE;
		const format = customOptions.format || DEFAULT_OPTIONS;

		return Promise.resolve({
			text: " " + ICON + " " + new Date().toLocaleDateString(locale, format) + " "
		});
	}
};
