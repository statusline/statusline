const os = require("os");

const exec = require("../../utils/exec");
const icons = require("../../utils/icons");

const WIFI_ICON = icons.network.wifi;
const ETHERNET_ICON = icons.network.ethernet;
const DISCONNECTED_ICON = icons.network.disconnected;
const DISCONNECTED_TEXT = "Disconnected";
const WEAKEST_DBM = -90;
const STRONGEST_DBM = -30;

/**
 * Finds the interface carrying the default route.
 *
 * @returns {Promise<?string>} Interface name, or null when there is no route
 */
const defaultInterface = function(){
	return exec.run("ip", ["route", "show", "default"]).then((output) => {
		const match = output.match(/\bdev\s+(\S+)/);

		if(!match){
			return null;
		}

		return match[1];
	}).catch(() => {
		return null;
	});
};

/**
 * Turns a signal reading in dBm into a percentage, the way wireless tools do.
 *
 * @param {number} dbm Signal strength in dBm, typically -90 to -30
 * @returns {number} Signal strength as a percentage
 */
const signalPercentage = function(dbm){
	const clamped = Math.max(WEAKEST_DBM, Math.min(dbm, STRONGEST_DBM));

	return Math.round((clamped - WEAKEST_DBM) / (STRONGEST_DBM - WEAKEST_DBM) * 100);
};

/**
 * Reads the network name and signal strength of a wireless interface.
 *
 * @param {string} name Interface name
 * @returns {Promise<?{essid: string, signal: ?number}>} Link details, or null
 */
const wirelessLink = function(name){
	return exec.run("iw", ["dev", name, "link"]).then((output) => {
		const essid = output.match(/SSID:\s*(.+)/);
		const signal = output.match(/signal:\s*(-?\d+)/);

		if(!essid){
			return null;
		}

		return {
			essid: essid[1].trim(),
			signal: signal ? signalPercentage(Number(signal[1])) : null
		};
	}).catch(() => {
		return null;
	});
};

/**
 * Shows the connection actually in use, named the way you would name it: the
 * wireless network if there is one, otherwise the wired interface.
 *
 * customOptions:
 *   interface - pin to a named interface instead of following the default route
 *   address   - append the IPv4 address of the interface
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};

		const chosen = customOptions.interface ? Promise.resolve(customOptions.interface) : defaultInterface();

		return chosen.then((name) => {
			if(!name){
				return {
					text: " " + DISCONNECTED_TEXT + " " + DISCONNECTED_ICON + " "
				};
			}

			return wirelessLink(name).then((link) => {
				const interfaces = os.networkInterfaces()[name] || [];

				const address = interfaces.filter((entry) => {
					return entry.family === "IPv4" && !entry.internal;
				})[0];

				const suffix = customOptions.address && address ? " " + address.address : "";

				if(link){
					const strength = link.signal === null ? "" : " (" + link.signal + "%)";

					return {
						text: " " + link.essid + strength + " " + WIFI_ICON + suffix + " "
					};
				}

				if(!address){
					return {
						text: " " + name + " (No IP) " + ETHERNET_ICON + " "
					};
				}

				return {
					text: " " + name + " " + ETHERNET_ICON + suffix + " "
				};
			});
		}).catch(() => {
			return {
				text: " " + DISCONNECTED_TEXT + " " + DISCONNECTED_ICON + " "
			};
		});
	}
};
