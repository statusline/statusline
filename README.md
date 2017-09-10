# statusline

This project is in development

![Screenshot](https://github.com/nemanjan00/statusline/blob/master/screenshot/screenshot.png?raw=true)

## Usage

### Installation

```bash
sudo npm install -g statusline
```

### Using within i3bar

In `~/.i3/config` find `status_command` and set it to `statusline i3status`.

## Features 

 - [x] Package manager (for installing packets inside users home, npm based)

For now can just install packages. (They can not be used/uninstalled)

 - [x] Block API for writing custom blocks (able to handle click events)

I was thinking about giving options object to package function and getting back object with default output and object for templating engine, for user defined text. 

 - [ ]  Middleware API for writing middleware that can alter final output

 - [ ] Command API for creating output for different applications, for example tmux status... 

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

Both middleware and blocks will be able to start rerender and there will be built in middleware for rerendering each x seconds. 

