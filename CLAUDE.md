# statusline

Universal status line in Node.js. Renders one set of blocks for many bars.

## Always use the JS skill

Any JavaScript work in this repo goes through `/implement-js` first. The code
style here follows it: tabs, double quotes, CommonJS, promises rather than
async/await, a folder with an `index.js` per module, constants at the top of the
file after the imports.

## Layout

| Path | Holds |
| --- | --- |
| `index.js` | command table, the only entry point |
| `src/cli` | argument dispatch for the command table |
| `src/commands/*` | one output protocol each: `i3status`, `waybar`, `tmux`, `lemonbar`, `cli`, `tui`, plus `install` and `uninstall` |
| `src/status` | the pipeline: load config, render blocks, run middleware, emit |
| `src/blocks/*` | one block each, plus `index.js` listing the built-in ones |
| `src/middleware/*` | one middleware each, plus `index.js` listing the built-in ones |
| `src/config` | loading and writing the config |
| `src/config/schema` | the config schema and its validator |
| `src/services/compositor` | Hyprland, Sway and i3 behind one interface |
| `src/utils/*` | `exec`, `sysfs`, `ansi`, `icons`, `truncate` |

## Rules that matter here

Nothing may take the bar down. A block that throws renders as empty, a broken
config falls back to the default, and a missing backend is caught. The failure
goes to `~/.statusline.log`, because stdout usually belongs to a bar protocol.

A block with nothing to say renders `{text: ""}` and disappears from the bar,
rather than drawing a placeholder. That is what lets one config work on both a
desktop and a laptop.

Icons are Private Use Area glyphs and must be written as code points in
`src/utils/icons/index.js`, never as literal characters. Literal PUA characters
do not survive being copied through terminals, editors and patches, and silently
become empty strings.

Blocks and middleware not built in are loaded from npm as
`statusline-block-<name>` and `statusline-middleware-<name>`, from
`~/.statusline_packages`.

Click events follow the i3bar numbering everywhere, including in the TUI: 1
left, 2 middle, 3 right, 4 scroll up, 5 scroll down. `relative_x` and `width`
are in pixels under a bar and in columns in the terminal, so convert to a
fraction before using them.

## Checks

```bash
yarn lint
node index.js cli --plain
node index.js tui
```
