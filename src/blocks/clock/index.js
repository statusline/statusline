const icons = require("../../utils/icons");
const state = require("../../services/state");

const ICON = icons.clock;
const STATE_KEY = "clock.mode";
const TIME = "time";
const DATE = "date";
const DEFAULT_TIME_FORMAT = {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false
};
const DEFAULT_DATE_FORMAT = {
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
};
const TOOLTIP_COLOR = "#000000";
const TOOLTIP_BACKGROUND = "#50fa7b";
const DAYS_IN_WEEK = 7;
const CELL_WIDTH = 2;

/**
 * Lays a month out as a grid of week rows, Monday first.
 *
 * @param {Date} date Any day in the month to lay out
 * @returns {Array<Array<?number>>} Week rows, padded with null
 */
const monthGrid = function(date){
	const year = date.getFullYear();
	const month = date.getMonth();

	const days = new Date(year, month + 1, 0).getDate();

	// getDay counts from Sunday; shift so a week starts on Monday
	const offset = (new Date(year, month, 1).getDay() + 6) % DAYS_IN_WEEK;

	const cells = Array.from({length: offset}).map(() => {
		return null;
	}).concat(Array.from({length: days}).map((ignored, index) => {
		return index + 1;
	}));

	const weeks = Math.ceil(cells.length / DAYS_IN_WEEK);

	return Array.from({length: weeks}).map((ignored, week) => {
		return Array.from({length: DAYS_IN_WEEK}).map((empty, day) => {
			const cell = cells[week * DAYS_IN_WEEK + day];

			return cell === undefined ? null : cell;
		});
	});
};

/**
 * Draws a month as text, with today picked out.
 *
 * @param {Date} date The day to centre the calendar on
 * @param {string} locale BCP 47 locale tag, or undefined for the system one
 * @param {{color: string, background: string}} today Colours for today
 * @returns {string} Calendar as pango markup
 */
const calendar = function(date, locale, today){
	const names = Array.from({length: DAYS_IN_WEEK}).map((ignored, day) => {
		// 2024-01-01 was a Monday, so this walks Monday to Sunday
		return new Date(2024, 0, 1 + day).toLocaleDateString(locale, {weekday: "short"}).slice(0, CELL_WIDTH);
	});

	const header = names.map((name) => {
		return name.padStart(CELL_WIDTH);
	}).join(" ");

	const rows = monthGrid(date).map((week) => {
		return week.map((day) => {
			if(day === null){
				return " ".repeat(CELL_WIDTH);
			}

			const cell = ("" + day).padStart(CELL_WIDTH);

			if(day !== date.getDate()){
				return cell;
			}

			return "<span foreground=\"" + today.color + "\" background=\"" + today.background + "\">" + cell + "</span>";
		}).join(" ");
	});

	return [header].concat(rows).join("\n");
};

/**
 * Shows the time, and the date when clicked.
 *
 * The mode is kept in the state file rather than in a variable, because bars
 * without a click protocol run the click in a separate process. Both processes
 * read the same file, and the bar redraws when it changes.
 *
 * Hovering shows the month, on bars that draw tooltips.
 *
 * customOptions:
 *   locale     - BCP 47 locale tag, defaults to the system locale
 *   format     - Intl.DateTimeFormat options for the time
 *   dateFormat - Intl.DateTimeFormat options for the date
 *   calendar   - set to false to leave the tooltip off
 *   icon       - set to false to show the time on its own
 */
module.exports = {
	/**
	 * Redraws when another process toggles the mode.
	 *
	 * @param {Object} block Block config
	 * @param {Object} status The status line
	 * @returns {Function} Call to stop watching
	 */
	watch: function(block, status){
		return state.subscribe(() => {
			status.update(block);
		});
	},
	render: function(block){
		const customOptions = block.customOptions || {};

		const now = new Date();

		const mode = state.get(STATE_KEY, TIME);

		let text;

		if(mode === DATE){
			text = now.toLocaleDateString(customOptions.locale, customOptions.dateFormat || DEFAULT_DATE_FORMAT);
		} else {
			text = now.toLocaleTimeString(customOptions.locale, customOptions.format || DEFAULT_TIME_FORMAT);
		}

		const rendered = {
			text: customOptions.icon === false ? " " + text + " " : " " + ICON + " " + text + " "
		};

		if(customOptions.calendar === false){
			return Promise.resolve(rendered);
		}

		const month = now.toLocaleDateString(customOptions.locale, {year: "numeric", month: "long"});

		const grid = calendar(now, customOptions.locale, {
			color: customOptions.tooltipColor || TOOLTIP_COLOR,
			background: customOptions.tooltipBackground || TOOLTIP_BACKGROUND
		});

		return Promise.resolve(Object.assign({}, rendered, {
			tooltip: "<big>" + month + "</big>\n<tt><small>" + grid + "</small></tt>"
		}));
	},
	onClick: function(){
		const mode = state.get(STATE_KEY, TIME);

		state.set(STATE_KEY, mode === TIME ? DATE : TIME);

		return Promise.resolve();
	}
};
