const compositor = require("../../services/compositor");
const markup = require("../../utils/markup");

const FOCUSED_COLOR = "#000000";
const FOCUSED_BACKGROUND = "#50fa7b";
const DEFAULT_PADDING = 1;
const LEFT_BUTTON = 1;
const SCROLL_UP = 4;
const SCROLL_DOWN = 5;

/**
 * Where each workspace ended up in the text of the last render, so a click can
 * be traced back to the workspace under the pointer.
 *
 * Offsets are into the visible text, never the markup, since what a bar
 * measures when it reports a click is what it drew.
 */
let layout = [];

/**
 * Builds the rendered text, recording the character range each workspace covers.
 *
 * The focused workspace is picked out in colour rather than wrapped in
 * brackets, so the block keeps the same width whichever workspace is focused
 * and the numbers stop shuffling sideways as you switch.
 *
 * Each workspace is padded on both sides and the padding sits inside the
 * colour, so the focused one reads as a button rather than a tinted digit, and
 * so the click target is bigger than a single character.
 *
 * @param {{names: string[], focused: string}} state Workspace state
 * @param {{color: string, background: string}} focused Colours for the focused one
 * @param {number} padding Spaces on each side of a workspace name
 * @returns {{text: string, length: number, layout: Array<{name: string, start: number, end: number}>}} Text, visible length and ranges
 */
const build = function(state, focused, padding){
	const spaces = " ".repeat(padding);

	return state.names.reduce((current, name) => {
		const label = spaces + markup.escape(name) + spaces;

		const painted = name === state.focused ? "<span foreground=\"" + focused.color + "\" background=\"" + focused.background + "\">" + label + "</span>" : label;

		const width = name.length + spaces.length * 2;

		return {
			text: current.text + painted,
			length: current.length + width,
			layout: current.layout.concat([{
				name: name,
				start: current.length,
				end: current.length + width - 1
			}])
		};
	}, {
		text: "",
		length: 0,
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
 * @param {number} length Visible length of the rendered text
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
 * Shows the workspaces that exist, with the focused one picked out in colour.
 *
 * Click a workspace to go to it, or scroll to move between them. Works under
 * Hyprland, Sway and i3.
 *
 * Clicking a particular workspace needs a bar that reports where inside a block
 * the click landed. The i3bar protocol does, and so does the terminal. A waybar
 * custom module does not, so under waybar use waybar's own workspaces module.
 *
 * customOptions:
 *   color      - text colour of the focused workspace, default "#000000"
 *   background - background of the focused workspace, default "#50fa7b"
 *   padding    - spaces on each side of a workspace name, default 1
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

		const focused = {
			color: customOptions.color || FOCUSED_COLOR,
			background: customOptions.background || FOCUSED_BACKGROUND
		};

		const padding = customOptions.padding === undefined ? DEFAULT_PADDING : customOptions.padding;

		return compositor.workspaces().then((state) => {
			const built = build(state, focused, padding);

			layout = built.layout;

			return {
				text: built.text,
				markup: "pango",
				length: built.length
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
		}, 0);

		const name = workspaceAt(click, length);

		if(!name){
			return Promise.resolve(null);
		}

		return compositor.focusWorkspace(name).catch(() => {
			return null;
		});
	}
};
