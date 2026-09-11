const ELLIPSIS = "…";

/**
 * Shortens text to a maximum length, appending an ellipsis when it was cut.
 *
 * @param {string} text Text to shorten
 * @param {number} maxLength Maximum length of the returned string
 * @returns {string} Text no longer than maxLength
 */
const truncate = function(text, maxLength){
	if(maxLength < 1 || text.length <= maxLength){
		return text;
	}

	return text.slice(0, maxLength - 1).trimEnd() + ELLIPSIS;
};

module.exports = truncate;
