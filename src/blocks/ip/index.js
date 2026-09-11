const os = require("os");

const exec = require("../../utils/exec");
const icons = require("../../utils/icons");

const ICON = icons.network.ethernet;
const VIRTUAL_PREFIXES = ["lo", "veth", "br-", "docker", "virbr", "vmnet", "tun", "tap", "wg"];
const NO_ADDRESS = "offline";

/**
 * Tells whether an interface is a bridge, container or tunnel device, i.e. one
 * nobody wants filling up their bar.
 *
 * @param {string} name Interface name
 * @returns {boolean} True when the interface is virtual
 */
const isVirtual = function(name){
	return VIRTUAL_PREFIXES.some((prefix) => {
		return name.indexOf(prefix) === 0;
	});
};

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
 * Collects IPv4 addresses per interface, skipping virtual and internal ones.
 *
 * @returns {Object<string, string>} Interface name to address
 */
const addresses = function(){
	const interfaces = os.networkInterfaces();

	return Object.keys(interfaces).filter((name) => {
		return !isVirtual(name);
	}).reduce((found, name) => {
		const address = (interfaces[name] || []).filter((entry) => {
			return entry.family === "IPv4" && !entry.internal;
		})[0];

		if(!address){
			return found;
		}

		return Object.assign({}, found, {
			[name]: address.address
		});
	}, {});
};

/**
 * Shows the address of the interface actually reaching the network, instead of
 * every address the machine happens to hold.
 *
 * customOptions:
 *   interface - pin to a named interface instead of following the default route
 *   all       - list every physical interface, "eno1 10.0.0.2" style
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const found = addresses();

		if(customOptions.all){
			const listed = Object.keys(found).map((name) => {
				return name + " " + found[name];
			}).join(", ");

			return Promise.resolve({
				text: " " + ICON + " " + (listed || NO_ADDRESS) + " "
			});
		}

		if(customOptions.interface){
			return Promise.resolve({
				text: " " + ICON + " " + (found[customOptions.interface] || NO_ADDRESS) + " "
			});
		}

		return defaultInterface().then((name) => {
			const address = found[name] || Object.keys(found).map((key) => {
				return found[key];
			})[0];

			return {
				text: " " + ICON + " " + (address || NO_ADDRESS) + " "
			};
		});
	}
};
