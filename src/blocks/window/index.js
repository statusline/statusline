const compositor = require("../../services/compositor");
const truncate = require("../../utils/truncate");

const DEFAULT_MAX_LENGTH = 60;

/**
 * Shows the title of the focused window.
 *
 * Works under Hyprland, Sway and i3, and renders nothing when no window is
 * focused or no supported compositor is running.
 *
 * customOptions:
 *   maxLength - trim the title to this many characters, defaults to 60
 */
module.exports = {
	/**
	 * Redraws on compositor events rather than waiting to be polled, so a
	 * window title change shows up as it happens.
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
		const maxLength = customOptions.maxLength || DEFAULT_MAX_LENGTH;

		return compositor.activeWindowTitle().then((title) => {
			if(!title){
				return {
					text: ""
				};
			}

			return {
				text: " " + truncate(title, maxLength) + " "
			};
		}).catch(() => {
			return {
				text: ""
			};
		});
	}
};
