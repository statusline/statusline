const sysfs = require("../../utils/sysfs");
const icons = require("../../utils/icons");

const MEMINFO_FILE = "/proc/meminfo";
const ICON = icons.memory;
const KB_PER_GB = 1024 * 1024;

/**
 * Reads /proc/meminfo into an object of kilobyte values.
 *
 * @returns {Promise<Object<string, number>>} Field name to kilobytes
 */
const readMeminfo = function(){
	return sysfs.read(MEMINFO_FILE).then((data) => {
		return data.split("\n").reduce((values, line) => {
			const parts = line.split(":");

			if(parts.length < 2){
				return values;
			}

			return Object.assign({}, values, {
				[parts[0]]: parseInt(parts[1].trim(), 10)
			});
		}, {});
	});
};

/**
 * Shows memory in use. Uses MemAvailable rather than MemFree, so cache and
 * buffers are not counted as used the way free(1) once did.
 *
 * customOptions:
 *   absolute - show "12.4G / 62.0G" instead of a percentage
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};

		return readMeminfo().then((values) => {
			const total = values["MemTotal"];
			const available = values["MemAvailable"];

			if(!total || available === undefined){
				return {
					text: " " + ICON + " ? "
				};
			}

			const used = total - available;

			if(customOptions.absolute){
				const usedGb = (used / KB_PER_GB).toFixed(1);
				const totalGb = (total / KB_PER_GB).toFixed(1);

				return {
					text: " " + ICON + " " + usedGb + "G / " + totalGb + "G "
				};
			}

			return {
				text: " " + ICON + " " + Math.round(used / total * 100) + "% "
			};
		}).catch(() => {
			return {
				text: " " + ICON + " ? "
			};
		});
	}
};
