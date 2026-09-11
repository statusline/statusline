const status = require("../../status");
const console = require("../../console");

const DEFAULT_BUTTON = 1;

/**
 * Sends a click to a named block.
 *
 * Bars that speak the i3bar protocol report clicks themselves, with the
 * position inside the block, and need none of this. waybar does not: a custom
 * module is one widget whose on-click runs a command, with no pointer position
 * and no way to say which block was under it. Naming the block is the best that
 * can be done there, which is enough for volume and media, and not enough for
 * workspaces.
 *
 * @param {string[]} args Block name, then an optional i3bar button number
 * @returns {Promise} Resolves once the click has been handled
 */
module.exports = function(args = []){
	const name = args[0];
	const button = Number(args[1]) || DEFAULT_BUTTON;

	global.SILENT = true;

	if(!name){
		console.error("Usage: statusline click <block> [button]");

		process.exitCode = 1;

		return Promise.resolve();
	}

	return status.init().then(() => {
		const block = status.blocks.filter((entry) => {
			return entry.name === name;
		})[0];

		if(!block){
			console.error("No block named " + name + " in this config. ");

			process.exitCode = 1;

			return null;
		}

		return status.clickBlock(block.id, {
			name: "block" + block.id,
			button: button
		});
	}).then(() => {
		process.exit(process.exitCode || 0);
	});
};
