/**
 * Blocks shipped with statusline.
 *
 * Anything not listed here is loaded from npm as statusline-block-<name>, so a
 * built-in and an installed block are used exactly the same way in the config.
 */
module.exports = {
	battery: require("./battery"),
	brightness: require("./brightness"),
	clock: require("./clock"),
	cpu: require("./cpu"),
	date: require("./date"),
	gpu: require("./gpu"),
	ip: require("./ip"),
	load: require("./load"),
	media: require("./media"),
	memory: require("./memory"),
	network: require("./network"),
	powerline: require("./powerline"),
	temperature: require("./temperature"),
	volume: require("./volume"),
	window: require("./window"),
	workspaces: require("./workspaces")
};
