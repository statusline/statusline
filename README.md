# statusline

This project is in development

![Screenshot](https://github.com/nemanjan00/statusline/blob/master/screenshot/screenshot.png?raw=true)

Features I plan to implement: 

 * Package manager (for installing packets inside users home, npm based)

 * Block API for writing custom blocks

I was thinking about giving options object to package function and getting back object with default output and object for templating engine, for user defined text. 

 * Middleware API for writing middleware that can alter final output

 * Command API for creating output for different applications, for example tmux status... 

 * Config system 

Something like this for now

```js
{
	blocks: [
		{
			block: "disk",
			backgroundColor: "#000",
			color: "#fff",
			customOptions: {
				disk: "/home",
				metric: "remainingSpace"
			}
		}
	],
	middleware: [
		{
			middleware: "powerlineSeparator"
		}
	]
}
```

Both middleware and blocks will be able to start rerender and there will be built in middleware for rerendering each x seconds. 

