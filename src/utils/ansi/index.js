const ESCAPE = String.fromCharCode(27);
const CSI = ESCAPE + "[";

/**
 * Turns a hex colour into an ANSI truecolor escape.
 *
 * @param {string} value Hex colour, "#rgb" or "#rrggbb"
 * @param {boolean} background Whether to set the background instead of the text
 * @returns {string} ANSI escape, empty when the colour cannot be parsed
 */
const color = function(value, background){
	if(!value){
		return "";
	}

	const hex = value.replace("#", "");

	const expanded = hex.length === 3 ? hex.split("").map((digit) => {
		return digit + digit;
	}).join("") : hex;

	if(expanded.length !== 6){
		return "";
	}

	const red = parseInt(expanded.slice(0, 2), 16);
	const green = parseInt(expanded.slice(2, 4), 16);
	const blue = parseInt(expanded.slice(4, 6), 16);

	if(isNaN(red) || isNaN(green) || isNaN(blue)){
		return "";
	}

	const channel = background ? "48" : "38";

	return CSI + channel + ";2;" + red + ";" + green + ";" + blue + "m";
};

module.exports = {
	escape: ESCAPE,
	csi: CSI,
	color: color,
	reset: CSI + "0m",
	clearLine: CSI + "2K",
	lineStart: "\r",
	hideCursor: CSI + "?25l",
	showCursor: CSI + "?25h",

	/**
	 * Turns mouse reporting on, in SGR mode so columns past 223 still report
	 * correctly.
	 */
	enableMouse: CSI + "?1000h" + CSI + "?1006h",
	disableMouse: CSI + "?1006l" + CSI + "?1000l"
};
