const sysfs = require("../../utils/sysfs");
const icons = require("../../utils/icons");

const POWER_SUPPLY_PATH = "/sys/class/power_supply";
const CHARGING_ICON = icons.battery.charging;
const FULL_ICON = icons.battery.full;
const DISCHARGING_ICONS = icons.battery.levels;
const LOW_THRESHOLD = 15;
const LOW_ICON = icons.battery.low;

/**
 * Finds the battery to report on, preferring an explicitly configured one.
 *
 * @param {string} [configured] Battery name from the block config, e.g. "BAT0"
 * @returns {Promise<?string>} Battery name, or null when the machine has none
 */
const findBattery = function(configured){
	if(configured){
		return Promise.resolve(configured);
	}

	return sysfs.list(POWER_SUPPLY_PATH).then((entries) => {
		const batteries = entries.filter((entry) => {
			return entry.indexOf("BAT") === 0 || entry.indexOf("CMB") === 0;
		});

		return batteries[0] || null;
	});
};

/**
 * Picks the icon matching the charge level, so the glyph alone reads as a gauge.
 *
 * @param {string} status Value of POWER_SUPPLY_STATUS
 * @param {number} percentage Charge level, 0 to 100
 * @returns {string} Icon to display
 */
const pickIcon = function(status, percentage){
	if(status === "Charging"){
		return CHARGING_ICON;
	}

	if(status === "Full"){
		return FULL_ICON;
	}

	if(percentage <= LOW_THRESHOLD){
		return LOW_ICON;
	}

	const step = Math.floor(percentage / 100 * DISCHARGING_ICONS.length);

	return DISCHARGING_ICONS[Math.min(step, DISCHARGING_ICONS.length - 1)];
};

/**
 * Turns a remaining-time estimate into "1h 20m", or an empty string when the
 * battery is idle and no estimate can be made.
 *
 * @param {Object<string, string>} values Parsed battery uevent
 * @returns {string} Human readable estimate, empty when unavailable
 */
const formatRemaining = function(values){
	const rate = Number(values["POWER_SUPPLY_POWER_NOW"] || values["POWER_SUPPLY_CURRENT_NOW"]);
	const now = Number(values["POWER_SUPPLY_ENERGY_NOW"] || values["POWER_SUPPLY_CHARGE_NOW"]);
	const full = Number(values["POWER_SUPPLY_ENERGY_FULL"] || values["POWER_SUPPLY_CHARGE_FULL"]);
	const status = values["POWER_SUPPLY_STATUS"];

	if(!rate || !now || !full){
		return "";
	}

	let remaining;

	if(status === "Charging"){
		remaining = (full - now) / rate;
	} else if(status === "Discharging"){
		remaining = now / rate;
	} else {
		return "";
	}

	const hours = Math.floor(remaining);
	const minutes = Math.round((remaining - hours) * 60);

	if(hours > 0){
		return " " + hours + "h " + minutes + "m";
	}

	return " " + minutes + "m";
};

/**
 * Shows battery charge with an icon that tracks the level.
 *
 * Renders nothing at all on machines without a battery, rather than the NaN a
 * desktop used to get.
 *
 * customOptions:
 *   battery   - battery name to read, e.g. "BAT1". Auto-detected otherwise
 *   remaining - append the estimated time to empty or full
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};

		return findBattery(customOptions.battery).then((battery) => {
			if(!battery){
				return {
					text: ""
				};
			}

			return sysfs.readKeyValue(sysfs.join(POWER_SUPPLY_PATH, battery, "uevent")).then((values) => {
				const now = Number(values["POWER_SUPPLY_ENERGY_NOW"] || values["POWER_SUPPLY_CHARGE_NOW"]);
				const full = Number(values["POWER_SUPPLY_ENERGY_FULL"] || values["POWER_SUPPLY_CHARGE_FULL"]);
				const reported = Number(values["POWER_SUPPLY_CAPACITY"]);

				let percentage;

				if(now && full){
					percentage = Math.round(now / full * 100);
				} else {
					percentage = reported;
				}

				if(isNaN(percentage)){
					return {
						text: ""
					};
				}

				const capped = Math.max(0, Math.min(percentage, 100));
				const status = values["POWER_SUPPLY_STATUS"] || "Unknown";
				const remaining = customOptions.remaining ? formatRemaining(values) : "";

				return {
					text: " " + pickIcon(status, capped) + " " + capped + "%" + remaining + " "
				};
			});
		}).catch(() => {
			return {
				text: ""
			};
		});
	}
};
