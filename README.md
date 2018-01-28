# statusline

This project is in development

Statusline is modular status line for use with i3bar, tmux, etc. 

![Screenshot](https://i.imgur.com/XbqhKgu.png)

[My config](https://gist.github.com/ef0998ba940a496feb212630b5e19f40)

## Usage

### Installation

```bash
sudo npm install -g statusline
```

### Using within i3bar

In `~/.i3/config` find `status_command` and set it to `statusline i3status`.

### Configuration

Your default config will be stored in: `~/.statusline.conf` when you run `statusline i3config` for the first time. 

## Features 

 - [x] Package manager (for installing packets inside users home, npm based)

Example block: https://github.com/statusline/statusline-block-time

To installe block, run: 

```bash
statusline install block-time
```

Note: Do not type `statusline-` on the beggining of package name. 

 - [x] Block API for writing custom blocks (able to handle click events)

Blocks available so far: `ip`, `load`, `time`, `date`, `battery`

I was thinking about giving options object to package function and getting back object with default output and object for templating engine, for user defined text. 

If you are developing block, keep in mind Promise may get replaced with EventEmmiter at a point in time... 

 - [ ]  Middleware API for writing middleware that can alter final output

 - [ ] Command API for creating output for different applications, for example tmux status... 

Only i3status available. It is built in. 

 - [x] Config system 

Something like this for now

```json
{
	"blocks": [
		{
			"name": "battery",
			"backgroundColor": "#000",
			"color": "#fff",
			"customOptions": {
				"battery": "BAT0"
			}
		}
	],
	"middleware": [
		{
			"middleware": "powerlineSeparator"
		}
	]
}
```
 - [ ] Async rendering and error handling

## Package naming

When creating package, it is important to follow naming convention. 

NPM package name should be: statusline-[block/middleware/command]-[name] (for example statusline-block-time). 

## Credits

[nemanjan00](https://github.com/nemanjan00)

