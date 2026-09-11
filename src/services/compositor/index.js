const net = require("net");
const path = require("path");

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

const IPC_MAGIC = "i3-ipc";
const IPC_HEADER_LENGTH = IPC_MAGIC.length + 8;
const IPC_SUBSCRIBE = 2;
const HYPRLAND_EVENTS = [
	"workspace",
	"workspacev2",
	"createworkspace",
	"destroyworkspace",
	"focusedmon",
	"activewindow",
	"activewindowv2",
	"closewindow",
	"openwindow",
	"windowtitle",
	"windowtitlev2",
	"movewindow",
	"urgent"
];
const RECONNECT_DELAY = 2000;

let detected;
let listeners = [];
let connection = null;

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

/**
 * Tells every listener that something changed, once per event.
 *
 * A socket read can carry several events at once, so the count matters: a
 * listener that counts events would miss the ones that happened to share a
 * chunk. Coalescing is the caller's business, not this module's.
 *
 * @param {number} times How many events arrived
 */
const notify = function(times){
	Array.from({length: times}).forEach(() => {
		listeners.forEach((listener) => {
			listener();
		});
	});
};

/**
 * Finds the Hyprland event socket.
 *
 * @returns {?string} Socket path, or null when the signature is not set
 */
const hyprlandSocket = function(){
	const signature = process.env["HYPRLAND_INSTANCE_SIGNATURE"];

	if(!signature){
		return null;
	}

	const runtime = process.env["XDG_RUNTIME_DIR"];

	if(runtime){
		return path.join(runtime, "hypr", signature, ".socket2.sock");
	}

	return path.join("/tmp", "hypr", signature, ".socket2.sock");
};

/**
 * Builds an i3 IPC message.
 *
 * The header is the magic string, then the payload length and the message
 * type, both as 32 bit native integers.
 *
 * @param {number} type Message type
 * @param {string} payload Message body
 * @returns {Buffer} Encoded message
 */
const encodeIpc = function(type, payload){
	const body = Buffer.from(payload, "utf8");
	const header = Buffer.alloc(IPC_HEADER_LENGTH);

	header.write(IPC_MAGIC, 0, "utf8");
	header.writeUInt32LE(body.length, IPC_MAGIC.length);
	header.writeUInt32LE(type, IPC_MAGIC.length + 4);

	return Buffer.concat([header, body]);
};

/**
 * Pulls whole i3 IPC messages out of a buffer.
 *
 * A socket read can stop in the middle of a message, or carry several at once,
 * so whatever is left over is handed back to be prepended to the next read.
 *
 * @param {Buffer} buffer Everything received and not yet consumed
 * @returns {{messages: number, rest: Buffer}} Count of messages and the remainder
 */
const decodeIpc = function(buffer){
	if(buffer.length < IPC_HEADER_LENGTH){
		return {
			messages: 0,
			rest: buffer
		};
	}

	const length = buffer.readUInt32LE(IPC_MAGIC.length);
	const total = IPC_HEADER_LENGTH + length;

	if(buffer.length < total){
		return {
			messages: 0,
			rest: buffer
		};
	}

	const next = decodeIpc(buffer.slice(total));

	return {
		messages: next.messages + 1,
		rest: next.rest
	};
};

/**
 * Opens the event stream of whichever compositor is running.
 *
 * Hyprland streams plain lines of "event>>data" on its second socket, while
 * Sway and i3 want an IPC subscription and answer in framed messages. Either
 * way a relevant event calls every listener.
 *
 * The connection is reopened after a delay if it drops, so a compositor restart
 * does not leave the bar frozen on stale values.
 */
const connect = function(){
	if(connection){
		return;
	}

	detect().then((kind) => {
		if(!kind){
			return;
		}

		const socketPath = kind === HYPRLAND ? hyprlandSocket() : process.env[kind === SWAY ? "SWAYSOCK" : "I3SOCK"];

		if(!socketPath){
			return;
		}

		const socket = net.connect(socketPath);

		connection = socket;

		socket.on("connect", () => {
			if(kind !== HYPRLAND){
				socket.write(encodeIpc(IPC_SUBSCRIBE, JSON.stringify(["workspace", "window"])));
			}
		});

		let buffered = Buffer.alloc(0);
		let pending = "";

		socket.on("data", (chunk) => {
			if(kind === HYPRLAND){
				pending = pending + chunk;

				const lines = pending.split("\n");

				pending = lines.pop();

				const relevant = lines.filter((line) => {
					return HYPRLAND_EVENTS.indexOf(line.split(">>")[0]) !== -1;
				});

				notify(relevant.length);

				return;
			}

			buffered = Buffer.concat([buffered, chunk]);

			const decoded = decodeIpc(buffered);

			buffered = decoded.rest;

			notify(decoded.messages);
		});

		const reopen = function(){
			connection = null;

			if(listeners.length === 0){
				return;
			}

			setTimeout(connect, RECONNECT_DELAY).unref();
		};

		socket.on("error", reopen);
		socket.on("close", reopen);

		socket.unref();
	});
};

const compositor = {
	hyprland: HYPRLAND,
	sway: SWAY,
	i3: I3,

	detect: detect,

	/**
	 * Calls back whenever a workspace or window changes.
	 *
	 * One connection is shared by every caller, since the events are the same
	 * for all of them.
	 *
	 * @param {Function} listener Called on each relevant event
	 * @returns {Function} Call to stop listening
	 */
	subscribe: function(listener){
		listeners = listeners.concat([listener]);

		connect();

		return function(){
			listeners = listeners.filter((entry) => {
				return entry !== listener;
			});

			if(listeners.length === 0 && connection){
				connection.destroy();
				connection = null;
			}
		};
	},

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
