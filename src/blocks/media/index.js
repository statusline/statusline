const exec = require("../../utils/exec");
const truncate = require("../../utils/truncate");
const icons = require("../../utils/icons");

const SEPARATOR = String.fromCharCode(31);
const FORMAT = "{{status}}" + SEPARATOR + "{{artist}}" + SEPARATOR + "{{title}}";
const PLAYING_ICON = icons.media.playing;
const PAUSED_ICON = icons.media.paused;
const DEFAULT_MAX_LENGTH = 40;
const MIDDLE_BUTTON = 2;
const RIGHT_BUTTON = 3;

/**
 * Shows what is playing, via playerctl.
 *
 * Renders nothing when no player is running, so the block disappears instead of
 * holding an empty slot in the bar. Left click toggles play and pause, right
 * click skips forward, middle click skips back.
 *
 * The unit separator is used to split playerctl's output, since a track title
 * can contain anything printable.
 *
 * customOptions:
 *   player    - restrict to a named player, e.g. "spotify"
 *   maxLength - trim the text to this many characters, defaults to 40
 */
module.exports = {
	render: function(block){
		const customOptions = block.customOptions || {};
		const maxLength = customOptions.maxLength || DEFAULT_MAX_LENGTH;

		const args = customOptions.player ? ["--player", customOptions.player] : [];

		return exec.run("playerctl", args.concat(["metadata", "--format", FORMAT])).then((output) => {
			const parts = output.split(SEPARATOR);

			const status = parts[0];
			const artist = (parts[1] || "").trim();
			const title = (parts[2] || "").trim();

			if(!title && !artist){
				return {
					text: ""
				};
			}

			const icon = status === "Playing" ? PLAYING_ICON : PAUSED_ICON;
			const label = artist ? artist + " - " + title : title;

			return {
				text: " " + icon + " " + truncate(label, maxLength) + " "
			};
		}).catch(() => {
			return {
				text: ""
			};
		});
	},
	onClick: function(click, block){
		const customOptions = block.customOptions || {};
		const args = customOptions.player ? ["--player", customOptions.player] : [];

		let command = "play-pause";

		if(click.button === RIGHT_BUTTON){
			command = "next";
		}

		if(click.button === MIDDLE_BUTTON){
			command = "previous";
		}

		return exec.run("playerctl", args.concat([command])).catch(() => {
			return null;
		});
	}
};
