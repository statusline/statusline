const sysfs = require("../../utils/sysfs");
const icons = require("../../utils/icons");
const markup = require("../../utils/markup");

const HWMON_PATH = "/sys/class/hwmon";
const PREFERRED_SENSORS = ["k10temp", "zenpower", "coretemp", "cpu_thermal", "acpitz"];
const DEFAULT_INPUT = "temp1_input";
const ICONS = icons.temperature;
const CRITICAL_THRESHOLD = 80;
const WARNING_THRESHOLD = 60;
const MILLIDEGREES = 1000;

/**
 * Colours for the three states, coolest first.
 *
 * Thresholds rather than a gradient, so a given colour always means the same
 * thing: a glance tells you which of three states the machine is in, not a hue
 * to be estimated against a scale.
 */
const COLORS = {
	normal: "#50fa7b",
	warning: "#f1fa8c",
	critical: "#ff5555"
};

/**
 * Finds the hwmon directory to read, preferring known CPU sensors.
 *
 * @param {string} [configured] Absolute hwmon path from the block config
 * @returns {Promise<?string>} Absolute hwmon directory, or null when none match
 */
const findSensor = function(configured){
	if(configured){
		return Promise.resolve(configured);
	}

	return sysfs.list(HWMON_PATH).then((entries) => {
		const named = entries.map((entry) => {
			const directory = sysfs.join(HWMON_PATH, entry);

			return sysfs.read(sysfs.join(directory, "name")).then((name) => {
				return {
					directory: directory,
					name: name
				};
			}).catch(() => {
				return null;
			});
		});

		return Promise.all(named).then((sensors) => {
			const available = sensors.filter(Boolean);

			const preferred = PREFERRED_SENSORS.map((name) => {
				return available.filter((sensor) => {
					return sensor.name === name;
				})[0];
			}).filter(Boolean)[0];

			if(!preferred){
				return null;
			}

			return preferred.directory;
		});
	});
};

/**
 * Picks an icon from the temperature, so a hot machine is visible at a glance.
 *
 * @param {number} degrees Temperature in degrees Celsius
 * @param {number} critical Threshold above which the hottest icon is used
 * @returns {string} Icon to display
 */
const pickIcon = function(degrees, critical){
	if(degrees >= critical){
		return ICONS[ICONS.length - 1];
	}

	const step = Math.floor(degrees / critical * ICONS.length);

	return ICONS[Math.min(step, ICONS.length - 1)];
};

/**
 * Picks the colour for a temperature.
 *
 * @param {number} degrees Temperature in degrees Celsius
 * @param {number} warning Threshold at which it stops being normal
 * @param {number} critical Threshold at which it becomes critical
 * @param {Object} colors Colours to choose between
 * @returns {string} Hex colour
 */
const pickColor = function(degrees, warning, critical, colors){
	if(degrees >= critical){
		return colors.critical;
	}

	if(degrees >= warning){
		return colors.warning;
	}

	return colors.normal;
};

/**
 * Shows CPU temperature, auto-detecting the sensor.
 *
 * hwmon numbering is not stable across boots, so the sensor is located by name
 * rather than by a /sys/class/hwmon/hwmonN path.
 *
 * customOptions:
 *   path     - absolute hwmon directory to read, skipping detection
 *   input    - input file to read, defaults to temp1_input
 *   critical - threshold in degrees for the hottest icon, defaults to 80
 *   warning  - threshold in degrees at which the colour changes, defaults to 60
 *   colors   - {normal, warning, critical} hex colours, or false to leave the
 *              text the colour of the rest of the block
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const critical = customOptions.critical || CRITICAL_THRESHOLD;
		const warning = customOptions.warning || WARNING_THRESHOLD;
		const colors = customOptions.colors === undefined ? COLORS : customOptions.colors;

		return findSensor(customOptions.path).then((directory) => {
			if(!directory){
				return {
					text: ""
				};
			}

			const input = customOptions.input || DEFAULT_INPUT;

			return sysfs.read(sysfs.join(directory, input)).then((value) => {
				const degrees = Math.round(Number(value) / MILLIDEGREES);

				const text = degrees + "°C " + pickIcon(degrees, critical);

				if(!colors){
					return {
						text: " " + text + " "
					};
				}

				const color = pickColor(degrees, warning, critical, Object.assign({}, COLORS, colors));

				return {
					text: " <span foreground=\"" + color + "\">" + markup.escape(text) + "</span> ",
					markup: "pango"
				};
			});
		}).catch(() => {
			return {
				text: ""
			};
		});
	}
};
