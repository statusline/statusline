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
| `statusline click` | bars without click events | sends a click to a named block |

Global flags: `--config <name>` picks a named config, and every command takes
`--interval <ms>`. `cli` takes `--width <n>` and `--plain`; `tmux` and `waybar`
take `--region <left|center|right>`, and `waybar` also takes
`--blocks <a,b,c>`. A command given a region or a block list never registers
the other blocks at all, so a module costs only what it draws.

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
    "exec": "statusline waybar --region right",
    "return-type": "json"
}
```

Then add `"custom/statusline"` to `modules-right`. waybar puts whole modules
into its own left, center and right lists, so to fill all three, declare the
module three times with a different `--region` each.

### tmux

In `~/.tmux.conf`:

```
set -g status-left "#(statusline tmux --region left)"
set -g status-right "#(statusline tmux --region right)"
```

tmux has a separate option per side rather than one line, which is what
`--region` is for.

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
| `blocks[].region` | `left`, `center` or `right`, default `left` |
| `blocks[].interval` | how often to re-render, in milliseconds |
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

## Refreshing

Blocks are not all polled on the same clock.

`workspaces` and `window` subscribe to the compositor and redraw the moment
something happens: Hyprland's event socket, or an i3 IPC subscription under Sway
and i3. A workspace switch shows up as it happens rather than up to a second
later.

Every other block has its own `interval`, in milliseconds, and is served from
its last value in between. This matters more than it sounds: asking pipewire for
the volume and the GPU for its usage costs more than every other block put
together, and neither changed because a window got focus. A redraw triggered by
a workspace switch costs about 3ms rather than 35ms.

```json
{"name": "gpu", "interval": 5000}
```

Watched blocks default to a 10 second interval as a safety net, everything else
to one second. A block can also declare `cacheable: false` and never be served
from the cache. Clicking a block throws its cached value away, since a click
usually changes the very thing it reports.

The config file is watched too. Save it and the bar rebuilds itself; there is no
need to restart the bar to try a change.

## Regions

A block can name a `region`: `left`, `center` or `right`. Blocks that name none
land on the left, so a config written before regions existed renders as it did.

```json
{"name": "workspaces", "region": "left"},
{"name": "window",     "region": "center"},
{"name": "date",       "region": "right"}
```

How much a region means depends on where the output goes:

| Output | Regions |
| --- | --- |
| `cli`, `tui` | spread across the terminal width; the centre gives way when a side grows into it |
| `lemonbar` | native `%{l}`, `%{c}`, `%{r}` alignment |
| `tmux`, `waybar` | pick one region per invocation with `--region` |
| `i3status` | **not supported.** Emitted in order, but not aligned |

The i3bar protocol has no notion of regions. Its status area is a single strip
against the right of the bar, which is why i3 and sway draw workspaces
themselves on the left. Blocks are still grouped by region so the order is
predictable, but nothing is aligned.

`powerlineSeparator` decorates each region separately, so an arrow never bridges
the gap between two sides of the bar.

## Clicks, and what each bar can do with them

The i3bar protocol reports a click with the position inside the block, which is
what lets `workspaces` tell which number was clicked. The terminal does the
same. waybar does not: a custom module is one widget, and its `on-click` runs a
command with no pointer position at all.

So under waybar:

- give each clickable block its own module with `--blocks <name>`, and point its
  hooks at `statusline click <name> <button>`. A module wide hook cannot tell
  the clock from the volume, and clicking the clock would act on whichever block
  the hook named
- for workspaces, use waybar's own `hyprland/workspaces` or `sway/workspaces`.
  It draws real buttons, so clicking, scrolling and its CSS states work

```json
"custom/statusline-volume": {
    "exec": "statusline waybar --blocks volume",
    "return-type": "json",
    "escape": false,
    "on-click": "statusline click volume 1",
    "on-scroll-up": "statusline click volume 4",
    "on-scroll-down": "statusline click volume 5"
}
```

Each module is a process, so this trades memory for clickability. Under i3bar or
swaybar one process does everything and every click works, with no hooks.

## State

Some blocks remember something between renders: the clock remembers whether it
is showing the time or the date. That cannot live in a variable, because a bar
without a click protocol runs `statusline click` as a separate process which
sets the value and exits, while the bar is a different process that has to
notice. It goes in `~/.local/state/statusline/state.json`, which is watched, so
a toggle from anywhere redraws the bar immediately.

Blocks read and write it through `src/services/state`. Keep it to small things;
it is state, not a cache and not a config.

## Named configs

The default config is `~/.statusline.conf`. Named ones live in
`~/.config/statusline/<name>.conf`:

```bash
statusline --config laptop i3status
statusline --config work tui
statusline configs                    # list them
STATUSLINE_CONFIG=laptop statusline cli
```

`--config` also takes a path, if it looks like one. A named config that does not
exist yet is created with the defaults on first use, so `statusline --config
laptop cli` is all it takes to start one.

## Blocks

All of these are built in. Anything else is installed from npm.

| Block | Shows | Clickable |
| --- | --- | --- |
| `workspaces` | workspaces, focused one in colour | click one to go to it, scroll to cycle |
| `window` | focused window title | |
| `media` | what is playing, via playerctl | play/pause, next, previous |
| `volume` | output volume | scroll to change, click to mute |
| `brightness` | screen backlight | scroll to change |
| `network` | wireless network and signal, or wired interface | |
| `ip` | address of the interface reaching the network | |
| `temperature` | CPU temperature | |
| `cpu` | CPU usage | |
| `gpu` | GPU usage, VRAM and temperature | |
| `memory` | memory in use | |
| `load` | load average | |
| `battery` | charge, with an icon that tracks the level | |
| `clock` | the time, or the date when clicked | click to swap time and date |
| `date` | the date, spelled out | |
| `powerline` | a single separator glyph | |

`workspaces` and `window` work under Hyprland, Sway and i3; the compositor is
detected at runtime. `volume` works with pipewire, pulseaudio or bare alsa,
whichever answers first. `brightness` reads sysfs, and writes through
brightnessctl, light or xbacklight. `gpu` reads NVIDIA cards through nvidia-smi
and AMD cards through sysfs; Intel cards expose no usage counter without
elevated privileges and are not supported.

Blocks that have nothing to say render nothing at all. A desktop with no battery
and no backlight simply does not draw those blocks, so the same config works on
a desktop and a laptop.

### Block options

Set these under `customOptions`.

| Block | Option | Meaning |
| --- | --- | --- |
| `workspaces` | `color`, `background` | colours of the focused workspace |
| `workspaces` | `padding` | spaces each side of a workspace name, default 1 |
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
| `gpu` | `card` | card index for nvidia-smi, or a name like `card0` for AMD |
| `gpu` | `memory` | append VRAM in use |
| `gpu` | `temperature` | append the card temperature |
| `memory` | `absolute` | show `12.4G / 62.0G` instead of a percentage |
| `load` | `all` | show all three averages |
| `load` | `perCore` | divide by core count, so 1.00 means fully loaded |
| `battery` | `battery` | battery name, autodetected otherwise |
| `battery` | `remaining` | append estimated time to empty or full |
| `clock` | `format`, `dateFormat` | `Intl.DateTimeFormat` options for each mode |
| `clock` | `calendar` | set to false to leave the hover calendar off |
| `clock` | `icon` | set to false to show the time on its own |
| `media` | `showPlayer` | prefix the text with the player's name |
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

`render` resolves with `{text}`, and may add `markup: "pango"` to say the text
carries markup. Escape anything that came from outside before putting it in
markup: one ampersand in a window title is enough to make a bar render the whole
line as nothing. `src/utils/markup` has `escape`, `strip` and `length`; widths
must be measured with `length`, never on the raw string. Resolve with an empty string to draw nothing at
all. `block` is the entry from the config, so `block.customOptions` is where
your options arrive.

A block can also export `watch(block, status)` to drive its own redraws instead
of waiting to be polled. Call `status.update(block)` when something changes, and
return a function that stops watching. Updates are coalesced, so a burst of
events costs one render.

`render` may also resolve with a `tooltip`, as pango markup, which bars that
draw tooltips will show on hover. The clock uses it for its calendar.

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
