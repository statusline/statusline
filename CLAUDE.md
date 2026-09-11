# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Universal status line in Node.js. Renders one configured set of blocks for many
different bars.

## Always use the JS skill

Any JavaScript work in this repo goes through `/implement-js` first. The style
here follows it: tabs, double quotes, CommonJS, promises rather than
async/await, a folder with an `index.js` per module, constants at the top of the
file after the imports.

## Commands

```bash
yarn install
yarn lint                    # eslint index.js src/ (flat config in eslint.config.js)

node index.js help           # list output commands
node index.js configs        # list named configs
node index.js cli --plain    # render one line and exit, the quickest check
node index.js tui            # live in the terminal, clickable; q or ctrl-c quits
node index.js i3status       # i3bar protocol, reads click events on stdin
```

There is no test suite. Changes are checked by running a renderer and reading
the line. To exercise a block without a compositor, an audio server or the real
hardware, replace `run` on the `src/utils/exec` module object before requiring
the block; the block picks up the replacement, since it calls `exec.run(...)`
through that object rather than destructuring it.

`node index.js cli` writes `~/.statusline.conf` on first run, and renders
against the real one after that. `--config <name>` (or `STATUSLINE_CONFIG`)
switches to `~/.config/statusline/<name>.conf`, which is the safe way to try a
config without touching the one driving the real bar. The flag is parsed in
`src/cli` and applied through `paths.useConfig` before any command runs, so
`paths.configFile` must always be read at call time, never captured at require
time.

## Architecture

The pipeline is the thing to understand. Everything else hangs off it:

**config → blocks → middleware → command**

`src/status` owns it. It loads and validates the config, registers a block per
entry, renders them all in parallel, runs the output through the middleware
chain, and emits the result on an EventEmitter. Each render produces an array of
objects in i3bar protocol shape (`full_text`, `color`, `background`, ...), which
is the internal format regardless of which bar is being fed.

A command in `src/commands/*` is a renderer for one consumer. It subscribes to
that emitter, formats the array its own way, and decides the timing: `i3status`,
`waybar` and `lemonbar` loop forever, `cli` and `tmux` print once unless asked to
watch, `tui` redraws in place and feeds mouse clicks back in. Adding a protocol
means adding a command, not touching the pipeline.

A block in `src/blocks/*` exports `render(block, status)` returning a promise of
`{text}`, and optionally `onClick(click, block, status)`. `block` is the config
entry, so `block.customOptions` is where per-block options arrive. Blocks not
built in are loaded from npm as `statusline-block-<name>`, and middleware as
`statusline-middleware-<name>`, from `~/.statusline_packages`; a built-in and an
installed block are used identically from the config.

Middleware in `src/middleware/*` exports `apply(output, options, status)` and
returns a new output array, so it can decorate, reorder or drop blocks after
rendering. `powerlineSeparator` is the built-in one.

`src/services/compositor` puts Hyprland, Sway and i3 behind one interface;
hyprctl speaks its own JSON while swaymsg and i3-msg share the i3 IPC format.
The `workspaces` and `window` blocks ask it rather than learning all three.
Detection is by environment variable first, probing the clients only as a
fallback, and is cached per process.

**Regions** are a per-block `region` field, grouped by `src/utils/regions`.
Support is per protocol, and unevenly so: `cli` and `tui` spread them across the
terminal width, `lemonbar` has native alignment markers, `tmux` and `waybar`
take one region per invocation, and the i3bar protocol cannot express them at
all — its status area is one right-aligned strip. Do not try to fake alignment
there with padding; block widths are in pixels and the bar width is unknown.

In the TUI each region is painted separately and then shifted into place, so
click ranges must be recorded before padding and offset afterwards. Getting this
wrong sends clicks to the wrong block, which no test will catch.

**Rendering is not one clock.** A block may export `watch(block, status)` and
call `status.update(block)` when it has something new; `workspaces` and `window`
do this over the compositor event socket. Everything else has a per-block
`interval` and is served from `status.cache` in between. `status.update()`
coalesces a burst into one render.

Keep this in mind when adding a block that shells out: its cost is paid by every
redraw that finds it stale, including ones triggered by an unrelated event. Give
an expensive block a longer interval rather than making the whole bar slow.

The config file is watched, and a change calls `status.reload()`, which throws
everything away and rebuilds. Block ids are reassigned on reload.

**Clicks depend on the bar, and waybar is the awkward one.** The i3bar protocol
and the TUI report a click with its position inside the block. waybar reports
nothing: a custom module is one widget whose on-click runs a command. Hence
`--blocks` and the `click` command, so a waybar module can carry one block and
its hooks are unambiguous. Never wire a module wide hook to a named block on a
module that draws several: clicking the clock would then act on the volume.

**Markup.** A block may return `markup: "pango"` and colour parts of its own
text. Outputs that cannot render markup strip it, and every width must be
measured with `markup.length`, never `String.length`, or a block carrying tags
is laid out as if the tags were visible. Anything from outside is escaped first.

## Invariants

**Nothing may take the bar down.** A block that throws renders as empty, a
broken config falls back to the default, a missing backend is caught. This is
why blocks catch their own errors rather than letting them propagate.

**Never write to stdout directly.** Under most commands stdout is a bar protocol
stream, and one stray line corrupts it. Use `src/console`, which redirects to
`~/.statusline.log` when `global.SILENT` is set. `console.output` is the one way
to write protocol output.

**A block with nothing to say returns `{text: ""}`** and disappears, rather than
drawing a placeholder. That is what lets one config work on a desktop and a
laptop: no battery and no backlight simply means those blocks are not drawn.

**Icons must be code points, never literal characters.** They live in
`src/utils/icons/index.js` as `String.fromCodePoint(...)`. They are Private Use
Area glyphs, which do not survive being copied through terminals, editors and
patches — they silently become empty strings, and the bar loses its icons with
nothing to show for it in a diff.

**Never pass user or config strings through a shell.** `src/utils/exec` uses
`execFile` with an argument list for exactly this reason; the dependency that
was dropped in favour of it had a critical command injection.

**Click events follow the i3bar numbering everywhere**, including in the TUI:
1 left, 2 middle, 3 right, 4 scroll up, 5 scroll down. `relative_x` and `width`
are pixels under a bar and columns in the terminal, so convert to a fraction of
the block width before mapping to a character offset — that is how `workspaces`
tells which number was clicked.

## Config

`~/.statusline.conf`, validated on load against `src/config/schema`, which is a
data description rather than code so the errors, the README and the validation
cannot drift apart. Unknown keys and malformed colours are reported by name and
position. Adding a block option means adding it to the schema too, or the
config that uses it is rejected.
