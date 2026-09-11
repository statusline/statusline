const exec = require("../../utils/exec");

/**
 * Talks to whichever compositor is running.
 *
 * Hyprland, Sway and i3 all answer the same questions, in three different
 * dialects: hyprctl speaks its own JSON, while swaymsg and i3-msg share the i3
 * IPC format. Blocks ask this module rather than learning all three.
 */

const HYPRLAND = "hyprland";
const SWAY = "sway";
const I3 = "i3";

const CLIENTS = {
	[HYPRLAND]: "hyprctl",
	[SWAY]: "swaymsg",
	[I3]: "i3-msg"
};

let detected;

/**
 * Works out which compositor is running.
 *
 * The environment is checked first, since that needs no subprocess, and the
 * clients are only probed when it says nothing useful.
 *
 * @returns {Promise<?string>} One of "hyprland", "sway", "i3", or null
 */
const detect = function(){
	if(detected !== undefined){
		return Promise.resolve(detected);
	}

	if(process.env["HYPRLAND_INSTANCE_SIGNATURE"]){
		detected = HYPRLAND;

		return Promise.resolve(detected);
	}

	if(process.env["SWAYSOCK"]){
		detected = SWAY;

		return Promise.resolve(detected);
	}

	if(process.env["I3SOCK"]){
		detected = I3;

		return Promise.resolve(detected);
	}

	return exec.run("hyprctl", ["version"]).then(() => {
		return HYPRLAND;
	}).catch(() => {
		return exec.run("swaymsg", ["-t", "get_version"]).then(() => {
			return SWAY;
		});
	}).catch(() => {
		return exec.run("i3-msg", ["-t", "get_version"]).then(() => {
			return I3;
		});
	}).catch(() => {
		return null;
	}).then((found) => {
		detected = found;

		return detected;
	});
};

/**
 * Walks an i3 IPC tree looking for the focused node.
 *
 * @param {Object} node Tree node
 * @returns {?Object} The focused node, or null
 */
const findFocused = function(node){
	if(node.focused){
		return node;
	}

	const children = (node.nodes || []).concat(node.floating_nodes || []);

	return children.reduce((found, child) => {
		if(found){
			return found;
		}

		return findFocused(child);
	}, null);
};

const compositor = {
	hyprland: HYPRLAND,
	sway: SWAY,
	i3: I3,

	detect: detect,

	/**
	 * Lists the workspaces that exist and says which one is focused.
	 *
	 * @returns {Promise<{names: string[], focused: string}>} Workspace state
	 */
	workspaces: function(){
		return detect().then((kind) => {
			if(!kind){
				return Promise.reject(new Error("No supported compositor found"));
			}

			if(kind === HYPRLAND){
				return Promise.all([
					exec.run(CLIENTS[kind], ["workspaces", "-j"]),
					exec.run(CLIENTS[kind], ["activeworkspace", "-j"])
				]).then((outputs) => {
					return {
						names: JSON.parse(outputs[0]).map((workspace) => {
							return "" + workspace.name;
						}),
						focused: "" + JSON.parse(outputs[1]).name
					};
				});
			}

			return exec.run(CLIENTS[kind], ["-t", "get_workspaces"]).then((output) => {
				const workspaces = JSON.parse(output);

				const focused = workspaces.filter((workspace) => {
					return workspace.focused;
				})[0];

				return {
					names: workspaces.map((workspace) => {
						return "" + workspace.name;
					}),
					focused: focused ? "" + focused.name : ""
				};
			});
		}).then((state) => {
			return {
				names: state.names.sort((left, right) => {
					return Number(left) - Number(right) || left.localeCompare(right);
				}),
				focused: state.focused
			};
		});
	},

	/**
	 * Focuses a workspace by name.
	 *
	 * @param {string} name Workspace name as the compositor reports it
	 * @returns {Promise} Resolves once the request has been sent
	 */
	focusWorkspace: function(name){
		return detect().then((kind) => {
			if(!kind){
				return null;
			}

			if(kind === HYPRLAND){
				const target = /^\d+$/.test(name) ? name : "name:" + name;

				return exec.run(CLIENTS[kind], ["dispatch", "workspace", target]);
			}

			return exec.run(CLIENTS[kind], ["workspace", name]);
		});
	},

	/**
	 * Focuses the next or previous workspace.
	 *
	 * @param {number} direction 1 for the next workspace, -1 for the previous one
	 * @returns {Promise} Resolves once the request has been sent
	 */
	cycleWorkspace: function(direction){
		return detect().then((kind) => {
			if(!kind){
				return null;
			}

			if(kind === HYPRLAND){
				return exec.run(CLIENTS[kind], ["dispatch", "workspace", direction < 0 ? "e-1" : "e+1"]);
			}

			return exec.run(CLIENTS[kind], ["workspace", direction < 0 ? "prev_on_output" : "next_on_output"]);
		});
	},

	/**
	 * Reads the title of the focused window.
	 *
	 * @returns {Promise<string>} Window title, empty when nothing is focused
	 */
	activeWindowTitle: function(){
		return detect().then((kind) => {
			if(!kind){
				return "";
			}

			if(kind === HYPRLAND){
				return exec.run(CLIENTS[kind], ["activewindow", "-j"]).then((output) => {
					return JSON.parse(output).title || "";
				});
			}

			return exec.run(CLIENTS[kind], ["-t", "get_tree"]).then((output) => {
				const focused = findFocused(JSON.parse(output));

				if(!focused){
					return "";
				}

				return focused.name || "";
			});
		});
	}
};

module.exports = compositor;
