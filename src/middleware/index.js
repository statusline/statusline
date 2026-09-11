/**
 * Middleware shipped with statusline.
 *
 * Middleware receives the fully rendered output array and returns a new one, so
 * it can reorder, decorate or drop blocks. Anything not listed here is loaded
 * from npm as statusline-middleware-<name>.
 */
module.exports = {
	powerlineSeparator: require("./powerlineSeparator")
};
