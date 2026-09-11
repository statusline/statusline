# statusline

Universal status line in Node.js. One config, one set of blocks, and whichever
bar you happen to be running today.

Write a block once and it works in i3bar, swaybar, waybar, polybar, lemonbar,
tmux, or straight in your terminal. Moving between window managers does not mean
rewriting your bar.

![Screenshot](https://i.imgur.com/jZ96YZx.png)

## Installation

```bash
npm install -g statusline
```

Then try it without configuring anything:

```bash
statusline cli
```

That prints one line and exits. On the first run it writes a default config to
`~/.statusline.conf` for you to edit.

## Output commands

Each command renders the same blocks for a different consumer.

| Command | For | Behaviour |
| --- | --- | --- |
| `statusline cli` | scripts, prompts, a quick look | prints one line and exits, or `--watch` to keep going |
| `statusline tui` | your terminal | redraws in place, and blocks are clickable |
| `statusline i3status` | i3bar, swaybar | i3bar protocol with click events |
| `statusline waybar` | waybar | JSON lines for a custom module |
| `statusline tmux` | tmux | one line with tmux colour directives |
| `statusline lemonbar` | lemonbar, polybar | one line with `%{F}` colour directives |

### i3 and sway

In `~/.config/i3/config` or `~/.config/sway/config`:

```
bar {
    status_command statusline i3status
}
```

### waybar

In `~/.config/waybar/config`:

```json
"custom/statusline": {
    "exec": "statusline waybar",
    "return-type": "json"
}
```

Then add `"custom/statusline"` to `modules-right`.

### tmux

In `~/.tmux.conf`:

```
set -g status-right "#(statusline tmux)"
```

### lemonbar and polybar

```bash
statusline lemonbar | lemonbar
```

### Terminal

```bash
statusline tui
```

Redraws in place and accepts mouse clicks, using the same click handling the bar
uses. `q` or `ctrl-c` quits. This is the quickest way to see what a config looks
like, and to check that a block you are writing handles its clicks.

## Configuration

Config lives in `~/.statusline.conf` and is written on first run.

```json
{
  "blocks": [
    {
      "name": "cpu",
      "color": "#1a1b26",
      "backgroundColor": "#ff9e64",
      "customOptions": {
        "absolute": true
      }
    }
  ],
  "middleware": [
    {
      "middleware": "powerlineSeparator",
      "options": {
        "trailing": false
      }
    }
  ]
}
```

| Key | Meaning |
| --- | --- |
| `blocks[].name` | block to render, built in or installed |
| `blocks[].color` | text colour, `#rgb` or `#rrggbb` |
| `blocks[].backgroundColor` | background colour |
| `blocks[].customOptions` | options for that block, listed below |
| `middleware[].middleware` | middleware to run over the rendered output |
| `middleware[].options` | options for that middleware |

The config is validated on load. A typo is reported by name and position:

```
✖ Config at /home/you/.statusline.conf is not valid:
✖   blocks[0].colour is not a known option, expected one of: name, color, backgroundColor, customOptions
✖   blocks[1].color must be a hex colour like "#ffffff", got "red"
✖ Falling back to the default config.
```

A broken config never takes the bar down with it. The problem is reported and
the default config is used, so there is still a status line to read the error
on.

## Blocks

All of these are built in. Anything else is installed from npm.

| Block | Shows | Clickable |
| --- | --- | --- |
| `workspaces` | workspaces, focused one in brackets | click one to go to it, scroll to cycle |
| `window` | focused window title | |
| `media` | what is playing, via playerctl | play/pause, next, previous |
| `volume` | output volume | scroll to change, click to mute |
| `brightness` | screen backlight | scroll to change |
| `network` | wireless network and signal, or wired interface | |
| `ip` | address of the interface reaching the network | |
| `temperature` | CPU temperature | |
| `cpu` | CPU usage | |
| `memory` | memory in use | |
| `load` | load average | |
| `battery` | charge, with an icon that tracks the level | |
| `date` | the date, spelled out | |
| `powerline` | a single separator glyph | |

`workspaces` and `window` work under Hyprland, Sway and i3; the compositor is
detected at runtime. `volume` works with pipewire, pulseaudio or bare alsa,
whichever answers first. `brightness` reads sysfs, and writes through
brightnessctl, light or xbacklight.

Blocks that have nothing to say render nothing at all. A desktop with no battery
and no backlight simply does not draw those blocks, so the same config works on
a desktop and a laptop.

### Block options

Set these under `customOptions`.

| Block | Option | Meaning |
| --- | --- | --- |
| `workspaces` | `prefix`, `suffix` | drawn around the focused workspace, default `[` and `]` |
| `window` | `maxLength` | trim the title, default 60 |
| `media` | `player` | restrict to one player, e.g. `spotify` |
| `media` | `maxLength` | trim the text, default 40 |
| `volume` | `control` | alsa mixer control, default `Master` |
| `volume` | `step` | percentage points per scroll, default 5 |
| `volume` | `headphone` | use the headphone icon |
| `volume` | `onRightClick` | command to run on right click, e.g. `pavucontrol` |
| `brightness` | `device` | backlight device, autodetected otherwise |
| `brightness` | `step` | percentage points per scroll, default 5 |
| `network` | `interface` | pin to an interface instead of following the default route |
| `network` | `address` | append the IPv4 address |
| `ip` | `interface` | pin to an interface |
| `ip` | `all` | list every physical interface |
| `temperature` | `path` | hwmon directory, autodetected otherwise |
| `temperature` | `input` | input file, default `temp1_input` |
| `temperature` | `critical` | threshold for the hottest icon, default 80 |
| `memory` | `absolute` | show `12.4G / 62.0G` instead of a percentage |
| `load` | `all` | show all three averages |
| `load` | `perCore` | divide by core count, so 1.00 means fully loaded |
| `battery` | `battery` | battery name, autodetected otherwise |
| `battery` | `remaining` | append estimated time to empty or full |
| `date` | `locale` | BCP 47 locale tag |
| `date` | `format` | `Intl.DateTimeFormat` options |

### Icons

Icons are Private Use Area glyphs, so a patched font is needed to see them: any
[Nerd Font](https://www.nerdfonts.com/) will do. They all live in
`src/utils/icons/index.js` as code points, which is the one place to change to
restyle the whole bar.

## Middleware

Middleware receives the fully rendered output and returns a new one, so it can
decorate, reorder or drop blocks after the fact.

`powerlineSeparator` is built in. It inserts an arrow between every pair of
blocks, drawn in the background colour of the block on its left over the
background colour of the block on its right, which is what makes the colours
appear to flow into one another.

```json
"middleware": [
  {
    "middleware": "powerlineSeparator",
    "options": {
      "trailing": false
    }
  }
]
```

## Installing more blocks

```bash
statusline install block-time
statusline uninstall block-time
```

Leave off the `statusline-` prefix; it is added for you. Packages are installed
into `~/.statusline_packages`, not globally.

Example block: https://github.com/statusline/statusline-block-time

## Writing a block

A block is a module exporting `render`, and optionally `onClick`.

```javascript
module.exports = {
	render: function(block, status){
		return Promise.resolve({
			text: " hello "
		});
	},
	onClick: function(click, block, status){
		return Promise.resolve();
	}
};
```

`render` resolves with `{text}`. Resolve with an empty string to draw nothing at
all. `block` is the entry from the config, so `block.customOptions` is where
your options arrive.

`onClick` receives the click event. `click.button` follows the i3bar numbering:
1 left, 2 middle, 3 right, 4 scroll up, 5 scroll down. The status line is
re-rendered once the returned promise settles.

`click.relative_x` and `click.width` say where inside the block the click
landed, which is how `workspaces` tells which of the numbers it drew was
clicked. i3bar measures both in pixels and the terminal measures both in
columns, so convert to a fraction before using them.

A block that throws is rendered as empty and the failure goes to
`~/.statusline.log`; one misbehaving block cannot take the bar down.

## Writing middleware

```javascript
module.exports = {
	apply: function(output, options, status){
		return output;
	}
};
```

`output` is the array of rendered blocks in i3bar protocol shape. Return a new
array rather than mutating the one you were given.

## Package naming

Published packages must be named
`statusline-[block/middleware/command]-[name]`, for example
`statusline-block-time`. That is how the installer and the loader find them.

## Development

```bash
yarn install
yarn lint
node index.js tui
```

## Credits

[nemanjan00](https://github.com/nemanjan00)

MIT
