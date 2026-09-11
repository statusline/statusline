const compositor = require("../../services/compositor");

const FOCUSED_PREFIX = "[";
const FOCUSED_SUFFIX = "]";
const LEFT_BUTTON = 1;
const SCROLL_UP = 4;
const SCROLL_DOWN = 5;

/**
 * Where each workspace ended up in the text of the last render, so a click can
 * be traced back to the workspace under the pointer.
 */
let layout = [];

/**
 * Builds the rendered text, recording the character range each workspace covers.
 *
 * @param {{names: string[], focused: string}} state Workspace state
 * @param {string} prefix Drawn before the focused workspace
 * @param {string} suffix Drawn after the focused workspace
 * @returns {{text: string, layout: Array<{name: string, start: number, end: number}>}} Text and ranges
 */
const build = function(state, prefix, suffix){
	return state.names.reduce((built, name) => {
		const separator = built.text === " " ? "" : " ";

		const label = name === state.focused ? prefix + name + suffix : name;

		const start = built.text.length + separator.length;

		return {
			text: built.text + separator + label,
			layout: built.layout.concat([{
				name: name,
				start: start,
				end: start + label.length - 1
			}])
		};
	}, {
		text: " ",
		layout: []
	});
};

/**
 * Finds the workspace a click landed on.
 *
 * A click event reports where it landed inside the block and how wide the block
 * is. i3bar measures both in pixels and the terminal measures both in columns,
 * so the position is converted to a fraction first and only then to an offset
 * into the rendered text. This assumes the bar draws the block in a monospaced
 * font, which is the usual case.
 *
 * @param {Object} click Click event
 * @param {number} length Length of the rendered text
 * @returns {?string} Workspace name, or null when the click missed
 */
const workspaceAt = function(click, length){
	if(!click || typeof click.relative_x !== "number" || !click.width){
		return null;
	}

	const offset = Math.floor(click.relative_x / click.width * length);

	const found = layout.filter((entry) => {
		return offset >= entry.start && offset <= entry.end;
	})[0];

	if(!found){
		return null;
	}

	return found.name;
};

/**
 * Shows the workspaces that exist, with the focused one marked.
 *
 * Click a workspace to go to it, or scroll to move between them. Works under
 * Hyprland, Sway and i3.
 *
 * customOptions:
 *   prefix - drawn before the focused workspace, defaults to "["
 *   suffix - drawn after the focused workspace, defaults to "]"
 */
module.exports = {
	/**
	 * Redraws on compositor events rather than waiting to be polled, so a
	 * workspace change shows up as it happens.
	 *
	 * @param {Object} block Block config
	 * @param {Object} status The status line
	 * @returns {Function} Call to stop watching
	 */
	watch: function(block, status){
		return compositor.subscribe(() => {
			status.update(block);
		});
	},
	render: function(block){
		const customOptions = block.customOptions || {};
		const prefix = customOptions.prefix || FOCUSED_PREFIX;
		const suffix = customOptions.suffix || FOCUSED_SUFFIX;

		return compositor.workspaces().then((state) => {
			const built = build(state, prefix, suffix);

			layout = built.layout;

			return {
				text: built.text + " "
			};
		}).catch(() => {
			layout = [];

			return {
				text: ""
			};
		});
	},
	onClick: function(click){
		if(click.button === SCROLL_UP){
			return compositor.cycleWorkspace(-1).catch(() => {
				return null;
			});
		}

		if(click.button === SCROLL_DOWN){
			return compositor.cycleWorkspace(1).catch(() => {
				return null;
			});
		}

		if(click.button !== LEFT_BUTTON){
			return Promise.resolve(null);
		}

		const length = layout.reduce((longest, entry) => {
			return Math.max(longest, entry.end + 1);
		}, 0) + 1;

		const name = workspaceAt(click, length);

		if(!name){
			return Promise.resolve(null);
		}

		return compositor.focusWorkspace(name).catch(() => {
			return null;
		});
	}
};
