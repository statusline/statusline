const os = require("os");
const icons = require("../../utils/icons");

const ICON = icons.load;
const DECIMALS = 2;

/**
 * Shows load average. By default only the one minute figure, since that is the
 * one worth glancing at; set customOptions.all to show all three.
 *
 * customOptions:
 *   all      - show the 1, 5 and 15 minute averages instead of just the first
 *   perCore  - divide by core count, so 1.00 always means "fully loaded"
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const cores = os.cpus().length || 1;

		const averages = os.loadavg().map((average) => {
			if(customOptions.perCore){
				return average / cores;
			}

			return average;
		}).map((average) => {
			return average.toFixed(DECIMALS);
		});

		const shown = customOptions.all ? averages.join(" ") : averages[0];

		return Promise.resolve({
			text: " " + ICON + " " + shown + " "
		});
	}
};
