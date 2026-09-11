const exec = require("../../utils/exec");
const truncate = require("../../utils/truncate");
const icons = require("../../utils/icons");

const SEPARATOR = String.fromCharCode(31);
const FIELDS = ["playerName", "status", "artist", "title"];
const FORMAT = FIELDS.map((field) => {
	return "{{" + field + "}}";
}).join(SEPARATOR);
const PLAYING = "Playing";
const PAUSED = "Paused";
const PRIORITY = [PLAYING, PAUSED];
const PLAYING_ICON = icons.media.playing;
const PAUSED_ICON = icons.media.paused;
const DEFAULT_MAX_LENGTH = 40;
const MIDDLE_BUTTON = 2;
const RIGHT_BUTTON = 3;

/**
 * Builds the playerctl arguments for a block.
 *
 * Without a player named in the config every player is asked, rather than
 * letting playerctl pick one for us: its choice is not the one you mean. A
 * paused Telegram message wins over Spotify actually playing, because the
 * choice has nothing to do with which is playing.
 *
 * @param {?string} player Player named in the config
 * @returns {string[]} Arguments selecting the players to ask about
 */
const selection = function(player){
	if(player){
		return ["--player", player];
	}

	return ["--all-players"];
};

/**
 * Parses one line of playerctl output.
 *
 * @param {string} line Line in the format this block asks for
 * @returns {?{player: string, status: string, artist: string, title: string}} Parsed line
 */
const parse = function(line){
	const parts = line.split(SEPARATOR);

	if(parts.length < FIELDS.length){
		return null;
	}

	return {
		player: parts[0].trim(),
		status: parts[1].trim(),
		artist: parts[2].trim(),
		title: parts[3].trim()
	};
};

/**
 * Picks the player worth showing.
 *
 * Whatever is playing wins, then whatever is paused, and ties keep the order
 * playerctl gave.
 *
 * @param {Array<{player: string, status: string, artist: string, title: string}>} players Parsed players
 * @returns {?Object} The player to show, or null when there is nothing to show
 */
const pick = function(players){
	const withSomething = players.filter((player) => {
		return player.title !== "" || player.artist !== "";
	});

	const byPriority = PRIORITY.map((status) => {
		return withSomething.filter((player) => {
			return player.status === status;
		})[0];
	}).filter(Boolean);

	if(byPriority.length > 0){
		return byPriority[0];
	}

	return withSomething[0] || null;
};

/**
 * Asks playerctl what is going on and picks a player.
 *
 * @param {?string} player Player named in the config
 * @returns {Promise<?Object>} The player to show, or null
 */
const current = function(player){
	return exec.run("playerctl", selection(player).concat(["metadata", "--format", FORMAT])).then((output) => {
		return pick(output.split("\n").map(parse).filter(Boolean));
	});
};

/**
 * Shows what is playing, via playerctl.
 *
 * Renders nothing when nothing is playing, so the block disappears instead of
 * holding an empty slot in the bar. Left click toggles play and pause, right
 * click skips forward, middle click skips back, all against the player being
 * shown rather than whichever one playerctl would have chosen.
 *
 * customOptions:
 *   player    - restrict to a named player, e.g. "spotify"
 *   maxLength - trim the text to this many characters, defaults to 40
 *   showPlayer - prefix the text with the player's name
 */
module.exports = {
	/**
	 * Redraws when a player changes what it is doing, rather than waiting to be
	 * polled, so a track change appears as it happens.
	 *
	 * @param {Object} block Block config
	 * @param {Object} status The status line
	 * @returns {Function} Call to stop watching
	 */
	watch: function(block, status){
		const customOptions = block.customOptions || {};

		return exec.stream("playerctl", selection(customOptions.player).concat(["metadata", "--follow", "--format", FORMAT]), () => {
			status.update(block);
		});
	},
	render: function(block){
		const customOptions = block.customOptions || {};
		const maxLength = customOptions.maxLength || DEFAULT_MAX_LENGTH;

		return current(customOptions.player).then((player) => {
			if(!player){
				return {
					text: ""
				};
			}

			const icon = player.status === PLAYING ? PLAYING_ICON : PAUSED_ICON;

			const label = player.artist ? player.artist + " - " + player.title : player.title;

			const prefix = customOptions.showPlayer ? player.player + ": " : "";

			return {
				text: " " + icon + " " + truncate(prefix + label, maxLength) + " "
			};
		}).catch(() => {
			return {
				text: ""
			};
		});
	},
	onClick: function(click, block){
		const customOptions = block.customOptions || {};

		let command = "play-pause";

		if(click.button === RIGHT_BUTTON){
			command = "next";
		}

		if(click.button === MIDDLE_BUTTON){
			command = "previous";
		}

		return current(customOptions.player).then((player) => {
			if(!player){
				return null;
			}

			return exec.run("playerctl", ["--player", player.player, command]);
		}).catch(() => {
			return null;
		});
	}
};
