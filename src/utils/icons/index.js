/**
 * Every icon statusline draws, in one place.
 *
 * The glyphs live in the Private Use Area of a patched font (a Nerd Font, or
 * Font Awesome), so they are written here as code points rather than as literal
 * characters: a code point survives being copied through a terminal, an editor
 * or a patch, and a Private Use Area character very often does not.
 *
 * Swap a value here to restyle the whole bar, or override a single icon from
 * the config through a block's customOptions.
 */
const char = function(codePoint){
	return String.fromCodePoint(codePoint);
};

module.exports = {
	char: char,

	cpu: char(0xF2DB),
	gpu: char(0xF108),
	memory: char(0xF1C0),
	load: char(0xF0E4),
	date: char(0xF073),
	clock: char(0xF017),
	disk: char(0xF0A0),

	network: {
		wifi: char(0xF1EB),
		ethernet: char(0xF6FF),
		disconnected: "⚠"
	},

	temperature: [char(0xF2CB), char(0xF2C9), char(0xF2C7)],

	battery: {
		charging: char(0xF0E7),
		full: char(0xF240),
		low: char(0xF244),
		levels: [char(0xF244), char(0xF243), char(0xF242), char(0xF241), char(0xF240)]
	},

	volume: {
		levels: [char(0xF026), char(0xF027), char(0xF028)],
		muted: char(0xF026) + char(0xF00D),
		headphone: char(0xF025)
	},

	brightness: [char(0xF186), char(0xF042), char(0xF185)],

	media: {
		playing: char(0xF04B),
		paused: char(0xF04C)
	},

	powerline: {
		right: char(0xE0B0),
		left: char(0xE0B2)
	}
};
