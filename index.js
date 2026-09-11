#!/usr/bin/env node

const cli = require("./src/cli");

const commands = {
	"i3status": {
		run: require("./src/commands/i3status"),
		description: "i3bar/swaybar protocol, for i3, sway and anything that speaks it"
	},
	"cli": {
		run: require("./src/commands/cli"),
		description: "plain text on stdout, for tmux, shell prompts and demos"
	},
	"tui": {
		run: require("./src/commands/tui"),
		description: "live status line in the terminal, clickable"
	},
	"waybar": {
		run: require("./src/commands/waybar"),
		description: "waybar custom module, JSON lines on stdout"
	},
	"tmux": {
		run: require("./src/commands/tmux"),
		description: "tmux status line, for status-right"
	},
	"lemonbar": {
		run: require("./src/commands/lemonbar"),
		description: "lemonbar and polybar formatting"
	},
	"install": {
		run: require("./src/commands/install"),
		description: "block/middleware installer"
	},
	"uninstall": {
		run: require("./src/commands/uninstall"),
		description: "block/middleware uninstaller"
	}
};

cli(commands);
