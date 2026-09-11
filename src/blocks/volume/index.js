const exec = require("../../utils/exec");
const icons = require("../../utils/icons");

const ICONS = icons.volume.levels;
const MUTED_ICON = icons.volume.muted;
const HEADPHONE_ICON = icons.volume.headphone;
const DEFAULT_STEP = 5;
const SCROLL_UP = 4;
const SCROLL_DOWN = 5;
const RIGHT_BUTTON = 3;
const SINK_EVENT = /on (sink|server)\b/;

/**
 * Reads volume through wpctl, the pipewire/wireplumber control tool.
 *
 * @returns {Promise<{volume: number, muted: boolean}>} Current sink state
 */
const readWpctl = function(){
	return exec.run("wpctl", ["get-volume", "@DEFAULT_AUDIO_SINK@"]).then((output) => {
		const match = output.match(/Volume:\s*([\d.]+)/);

		if(!match){
			return Promise.reject(new Error("Unexpected wpctl output"));
		}

		return {
			volume: Math.round(Number(match[1]) * 100),
			muted: output.indexOf("MUTED") !== -1
		};
	});
};

/**
 * Reads volume through pactl, for a pulseaudio server.
 *
 * @returns {Promise<{volume: number, muted: boolean}>} Current sink state
 */
const readPactl = function(){
	return exec.run("pactl", ["get-sink-volume", "@DEFAULT_SINK@"]).then((output) => {
		const match = output.match(/(\d+)%/);

		if(!match){
			return Promise.reject(new Error("Unexpected pactl output"));
		}

		return exec.run("pactl", ["get-sink-mute", "@DEFAULT_SINK@"]).then((muteOutput) => {
			return {
				volume: Number(match[1]),
				muted: muteOutput.indexOf("yes") !== -1
			};
		});
	});
};

/**
 * Reads volume through amixer, for a plain alsa setup.
 *
 * @param {string} control Mixer control name, e.g. "Master"
 * @returns {Promise<{volume: number, muted: boolean}>} Current mixer state
 */
const readAmixer = function(control){
	return exec.run("amixer", ["get", control]).then((output) => {
		const match = output.match(/\[(\d+)%\]/);

		if(!match){
			return Promise.reject(new Error("Unexpected amixer output"));
		}

		return {
			volume: Number(match[1]),
			muted: output.indexOf("[off]") !== -1
		};
	});
};

/**
 * Reads the current volume, trying each backend in turn.
 *
 * @param {string} control Mixer control name used by the alsa backend
 * @returns {Promise<{volume: number, muted: boolean}>} Current state
 */
const readVolume = function(control){
	return readWpctl().catch(() => {
		return readPactl();
	}).catch(() => {
		return readAmixer(control);
	});
};

/**
 * Applies a volume change through whichever backend answers.
 *
 * @param {number} delta Percentage points to add, may be negative
 * @param {string} control Mixer control name used by the alsa backend
 * @returns {Promise} Resolves once the change has been applied
 */
const changeVolume = function(delta, control){
	const sign = delta < 0 ? "-" : "+";
	const amount = Math.abs(delta);

	return exec.run("wpctl", ["set-volume", "@DEFAULT_AUDIO_SINK@", amount + "%" + sign]).catch(() => {
		return exec.run("pactl", ["set-sink-volume", "@DEFAULT_SINK@", sign + amount + "%"]);
	}).catch(() => {
		return exec.run("amixer", ["set", control, amount + "%" + sign]);
	}).catch(() => {
		return null;
	});
};

/**
 * Toggles mute through whichever backend answers.
 *
 * @param {string} control Mixer control name used by the alsa backend
 * @returns {Promise} Resolves once mute has been toggled
 */
const toggleMute = function(control){
	return exec.run("wpctl", ["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"]).catch(() => {
		return exec.run("pactl", ["set-sink-mute", "@DEFAULT_SINK@", "toggle"]);
	}).catch(() => {
		return exec.run("amixer", ["set", control, "toggle"]);
	}).catch(() => {
		return null;
	});
};

/**
 * Picks an icon from the volume level.
 *
 * @param {number} volume Volume percentage
 * @returns {string} Icon to display
 */
const pickIcon = function(volume){
	const step = Math.floor(volume / 100 * ICONS.length);

	return ICONS[Math.min(step, ICONS.length - 1)];
};

/**
 * Shows the volume of the default output, and lets you change it.
 *
 * Works with pipewire, pulseaudio or bare alsa, whichever responds first.
 * Scroll to change the volume, left click or right click to toggle mute.
 *
 * customOptions:
 *   control   - alsa mixer control name, defaults to "Master"
 *   step      - percentage points per scroll step, defaults to 5
 *   headphone - use the headphone icon instead of the speaker icons
 */
module.exports = {
	/**
	 * Redraws when the audio server says something changed, so the volume shown
	 * matches the volume set the moment a key or a scroll changes it, rather
	 * than at the next poll.
	 *
	 * pactl is present for pulseaudio and for pipewire through pipewire-pulse.
	 * Without it the block simply falls back to being polled.
	 *
	 * @param {Object} block Block config
	 * @param {Object} status The status line
	 * @returns {Function} Call to stop watching
	 */
	watch: function(block, status){
		return exec.stream("pactl", ["subscribe"], (line) => {
			if(!SINK_EVENT.test(line)){
				return;
			}

			status.update(block);
		});
	},
	render: function(block){
		const customOptions = block.customOptions || {};
		const control = customOptions.control || "Master";

		return readVolume(control).then((state) => {
			if(state.muted){
				return {
					text: " " + MUTED_ICON + " " + state.volume + "% "
				};
			}

			const icon = customOptions.headphone ? HEADPHONE_ICON : pickIcon(state.volume);

			return {
				text: " " + icon + " " + state.volume + "% "
			};
		}).catch(() => {
			return {
				text: ""
			};
		});
	},
	onClick: function(click, block){
		const customOptions = block.customOptions || {};
		const control = customOptions.control || "Master";
		const step = customOptions.step || DEFAULT_STEP;

		if(click.button === SCROLL_UP){
			return changeVolume(step, control);
		}

		if(click.button === SCROLL_DOWN){
			return changeVolume(-step, control);
		}

		if(click.button === RIGHT_BUTTON && customOptions.onRightClick){
			return exec.run("sh", ["-c", customOptions.onRightClick]).catch(() => {
				return null;
			});
		}

		return toggleMute(control);
	}
};
