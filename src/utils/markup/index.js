const ansi = require("../ansi");

const SPAN = /<span\b([^>]*)>([\s\S]*?)<\/span>/g;
const ATTRIBUTE = /(\w+)\s*=\s*"([^"]*)"/g;
const TAG = /<[^>]+>/g;

const ENTITIES = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": "\"",
	"&apos;": "'"
};

const ESCAPES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
};

/**
 * Escapes the characters pango markup treats as syntax.
 *
 * Any text that came from outside, a window title above all, has to go through
 * this before being placed in markup: one ampersand in a title is enough to
 * make the whole line fail to parse and render as nothing.
 *
 * @param {string} text Text to escape
 * @returns {string} Text safe to place inside markup
 */
const escape = function(text){
	return text.replace(/[&<>"']/g, (character) => {
		return ESCAPES[character];
	});
};

/**
 * Removes markup, leaving the text a reader actually sees.
 *
 * @param {string} text Text that may contain markup
 * @returns {string} Text with tags removed and entities decoded
 */
const strip = function(text){
	return text.replace(TAG, "").replace(/&(amp|lt|gt|quot|apos);/g, (entity) => {
		return ENTITIES[entity];
	});
};

/**
 * Counts the characters a reader sees, ignoring markup.
 *
 * Widths must be measured on this rather than on the raw string, or a block
 * carrying markup would be laid out as if its tags took up space.
 *
 * @param {string} text Text that may contain markup
 * @returns {number} Visible length
 */
const length = function(text){
	return strip(text).length;
};

/**
 * Translates pango colour spans into ANSI escapes.
 *
 * Only the attributes statusline itself emits are understood, which is enough
 * to show a terminal the same thing a bar would show.
 *
 * @param {string} text Text that may contain markup
 * @param {string} [after] Escape sequence to restore after each span
 * @returns {string} Text with ANSI colour escapes
 */
const toAnsi = function(text, after = ""){
	return strip(text.replace(SPAN, (match, attributes, content) => {
		const found = {};

		let attribute = ATTRIBUTE.exec(attributes);

		while(attribute !== null){
			found[attribute[1]] = attribute[2];

			attribute = ATTRIBUTE.exec(attributes);
		}

		ATTRIBUTE.lastIndex = 0;

		const prefix = ansi.color(found["background"], true) + ansi.color(found["foreground"], false);

		if(prefix === ""){
			return content;
		}

		return prefix + content + ansi.reset + after;
	}));
};

module.exports = {
	escape: escape,
	strip: strip,
	length: length,
	toAnsi: toAnsi
};
