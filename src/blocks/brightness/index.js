const sysfs = require("../../utils/sysfs");
const exec = require("../../utils/exec");
const icons = require("../../utils/icons");

const BACKLIGHT_PATH = "/sys/class/backlight";
const ICONS = icons.brightness;
const DEFAULT_STEP = 5;
const SCROLL_UP = 4;
const SCROLL_DOWN = 5;

/**
 * Finds the backlight device to read.
 *
 * @param {string} [configured] Device name from the block config
 * @returns {Promise<?string>} Device name, or null when there is no backlight
 */
const findDevice = function(configured){
	if(configured){
		return Promise.resolve(configured);
	}

	return sysfs.list(BACKLIGHT_PATH).then((entries) => {
		return entries[0] || null;
	});
};

/**
 * Reads the brightness of a device as a percentage of its maximum.
 *
 * @param {string} device Backlight device name
 * @returns {Promise<number>} Brightness percentage
 */
const readBrightness = function(device){
	const directory = sysfs.join(BACKLIGHT_PATH, device);

	return Promise.all([
		sysfs.read(sysfs.join(directory, "brightness")),
		sysfs.read(sysfs.join(directory, "max_brightness"))
	]).then((values) => {
		const current = Number(values[0]);
		const max = Number(values[1]);

		if(!max){
			return Promise.reject(new Error("Backlight reports no maximum"));
		}

		return Math.round(current / max * 100);
	});
};

/**
 * Applies a brightness change.
 *
 * Prefers brightnessctl and light, which work under Wayland; xbacklight is
 * tried last, as it only speaks to an X server.
 *
 * @param {number} delta Percentage points to add, may be negative
 * @param {string} device Backlight device name
 * @returns {Promise} Resolves once the change has been applied
 */
const changeBrightness = function(delta, device){
	const amount = Math.abs(delta);

	if(delta < 0){
		return exec.run("brightnessctl", ["--device", device, "set", amount + "%-"]).catch(() => {
			return exec.run("light", ["-U", "" + amount]);
		}).catch(() => {
			return exec.run("xbacklight", ["-dec", "" + amount]);
		}).catch(() => {
			return null;
		});
	}

	return exec.run("brightnessctl", ["--device", device, "set", "+" + amount + "%"]).catch(() => {
		return exec.run("light", ["-A", "" + amount]);
	}).catch(() => {
		return exec.run("xbacklight", ["-inc", "" + amount]);
	}).catch(() => {
		return null;
	});
};

/**
 * Picks an icon from the brightness level.
 *
 * @param {number} brightness Brightness percentage
 * @returns {string} Icon to display
 */
const pickIcon = function(brightness){
	const step = Math.floor(brightness / 100 * ICONS.length);

	return ICONS[Math.min(step, ICONS.length - 1)];
};

/**
 * Shows screen backlight level, and lets you scroll to change it.
 *
 * Renders nothing on machines without a backlight, so the same config works on
 * a desktop and a laptop.
 *
 * customOptions:
 *   device - backlight device name, e.g. "intel_backlight". Auto-detected otherwise
 *   step   - percentage points per scroll step, defaults to 5
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};

		return findDevice(customOptions.device).then((device) => {
			if(!device){
				return {
					text: ""
				};
			}

			return readBrightness(device).then((brightness) => {
				return {
					text: " " + pickIcon(brightness) + " " + brightness + "% "
				};
			});
		}).catch(() => {
			return {
				text: ""
			};
		});
	},
	onClick: function(click, block){
		const customOptions = block.customOptions || {};
		const step = customOptions.step || DEFAULT_STEP;

		if(click.button !== SCROLL_UP && click.button !== SCROLL_DOWN){
			return Promise.resolve(null);
		}

		return findDevice(customOptions.device).then((device) => {
			if(!device){
				return null;
			}

			if(click.button === SCROLL_UP){
				return changeBrightness(step, device);
			}

			return changeBrightness(-step, device);
		}).catch(() => {
			return null;
		});
	}
};
