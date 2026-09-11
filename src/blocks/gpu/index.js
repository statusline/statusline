const exec = require("../../utils/exec");
const sysfs = require("../../utils/sysfs");
const icons = require("../../utils/icons");

const ICON = icons.gpu;
const DRM_PATH = "/sys/class/drm";
const NVIDIA_QUERY = "utilization.gpu,memory.used,memory.total,temperature.gpu";
const MB_PER_GB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const MILLIDEGREES = 1000;

/**
 * Reads an NVIDIA card through nvidia-smi.
 *
 * @param {?string} card Card index, or null for the first one
 * @returns {Promise<{usage: number, used: number, total: number, temperature: ?number}>} Card state
 */
const readNvidia = function(card){
	const args = ["--query-gpu=" + NVIDIA_QUERY, "--format=csv,noheader,nounits"];

	return exec.run("nvidia-smi", card === null ? args : args.concat(["--id=" + card])).then((output) => {
		const values = output.split("\n")[0].split(",").map((value) => {
			return Number(value.trim());
		});

		if(isNaN(values[0])){
			return Promise.reject(new Error("Unexpected nvidia-smi output"));
		}

		return {
			usage: values[0],
			used: values[1],
			total: values[2],
			temperature: isNaN(values[3]) ? null : values[3]
		};
	});
};

/**
 * Finds an AMD card exposing usage in sysfs.
 *
 * @param {?string} card Card name such as "card0", or null to search
 * @returns {Promise<?string>} Absolute device directory, or null
 */
const findAmd = function(card){
	if(card){
		return Promise.resolve(sysfs.join(DRM_PATH, card, "device"));
	}

	return sysfs.list(DRM_PATH).then((entries) => {
		const cards = entries.filter((entry) => {
			return /^card\d+$/.test(entry);
		});

		const checked = cards.map((entry) => {
			const directory = sysfs.join(DRM_PATH, entry, "device");

			return sysfs.read(sysfs.join(directory, "gpu_busy_percent")).then(() => {
				return directory;
			}).catch(() => {
				return null;
			});
		});

		return Promise.all(checked).then((found) => {
			return found.filter(Boolean)[0] || null;
		});
	});
};

/**
 * Reads an AMD card through sysfs.
 *
 * @param {string} directory Device directory of the card
 * @returns {Promise<{usage: number, used: number, total: number, temperature: ?number}>} Card state
 */
const readAmd = function(directory){
	return sysfs.read(sysfs.join(directory, "gpu_busy_percent")).then((busy) => {
		const memory = Promise.all([
			sysfs.read(sysfs.join(directory, "mem_info_vram_used")).catch(() => {
				return null;
			}),
			sysfs.read(sysfs.join(directory, "mem_info_vram_total")).catch(() => {
				return null;
			})
		]);

		const temperature = sysfs.list(sysfs.join(directory, "hwmon")).then((entries) => {
			if(entries.length === 0){
				return null;
			}

			return sysfs.read(sysfs.join(directory, "hwmon", entries[0], "temp1_input")).then((value) => {
				return Math.round(Number(value) / MILLIDEGREES);
			});
		}).catch(() => {
			return null;
		});

		return Promise.all([memory, temperature]).then((values) => {
			return {
				usage: Number(busy),
				used: values[0][0] === null ? null : Math.round(Number(values[0][0]) / BYTES_PER_MB),
				total: values[0][1] === null ? null : Math.round(Number(values[0][1]) / BYTES_PER_MB),
				temperature: values[1]
			};
		});
	});
};

/**
 * Reads whichever card is present.
 *
 * @param {?string} card Card index or name from the config
 * @returns {Promise<{usage: number, used: ?number, total: ?number, temperature: ?number}>} Card state
 */
const readGpu = function(card){
	return readNvidia(card).catch(() => {
		return findAmd(card).then((directory) => {
			if(!directory){
				return Promise.reject(new Error("No supported GPU found"));
			}

			return readAmd(directory);
		});
	});
};

/**
 * Shows GPU usage, the same way the cpu block shows CPU usage.
 *
 * Reads an NVIDIA card through nvidia-smi and an AMD card through sysfs, and
 * renders nothing when neither is there. Intel cards expose no usage counter
 * without elevated privileges, so they are not supported.
 *
 * customOptions:
 *   card        - card index for nvidia-smi, or a name like "card0" for AMD
 *   memory      - append VRAM in use
 *   temperature - append the card temperature
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const card = customOptions.card === undefined ? null : "" + customOptions.card;

		return readGpu(card).then((state) => {
			const parts = [state.usage + "%"];

			if(customOptions.memory && state.used !== null && state.total !== null){
				parts.push((state.used / MB_PER_GB).toFixed(1) + "G / " + (state.total / MB_PER_GB).toFixed(1) + "G");
			}

			if(customOptions.temperature && state.temperature !== null){
				parts.push(state.temperature + "°C");
			}

			return {
				text: " " + ICON + " " + parts.join(" ") + " "
			};
		}).catch(() => {
			return {
				text: ""
			};
		});
	}
};
