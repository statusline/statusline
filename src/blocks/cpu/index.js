const sysfs = require("../../utils/sysfs");
const icons = require("../../utils/icons");

const STAT_FILE = "/proc/stat";
const ICON = icons.cpu;

let previous = null;

/**
 * Reads the aggregate CPU counters from /proc/stat.
 *
 * @returns {Promise<{total: number, idle: number}>} Jiffy counters since boot
 */
const readCounters = function(){
	return sysfs.read(STAT_FILE).then((data) => {
		const line = data.split("\n")[0];

		const values = line.trim().split(/\s+/).slice(1).map(Number);

		const total = values.reduce((sum, value) => {
			return sum + value;
		}, 0);

		const idle = values[3] + (values[4] || 0);

		return {
			total: total,
			idle: idle
		};
	});
};

/**
 * Shows CPU usage as a percentage, measured between renders.
 *
 * The first render has no previous sample to compare against and reports 0%.
 */
module.exports = {
	render: function(){
		return readCounters().then((current) => {
			const last = previous;

			previous = current;

			if(!last){
				return {
					text: " " + ICON + " 0% "
				};
			}

			const totalDelta = current.total - last.total;
			const idleDelta = current.idle - last.idle;

			if(totalDelta <= 0){
				return {
					text: " " + ICON + " 0% "
				};
			}

			const usage = Math.round((1 - idleDelta / totalDelta) * 100);

			return {
				text: " " + ICON + " " + Math.max(0, Math.min(usage, 100)) + "% "
			};
		}).catch(() => {
			return {
				text: " " + ICON + " ?% "
			};
		});
	}
};
