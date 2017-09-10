#!/usr/bin/env node

const fs = require('fs');

const status = require("../status");
const console = require("../console");

const i3status = {
	init: function(){
		global.SILENT = true;

		console.output("{\"version\":1, \"click_events\": true}");
		console.output("[{}");

		status.emitter.on("output", i3status.render);

		setInterval(function(){
			status.render();
		}, 1000);

		i3status.listenForClicks();
	},
	render: function(output){
		console.output(", "+JSON.stringify(output));
	},
	listenForClicks: function(){
		process.stdin.on('readable', () => {
			let chunk = process.stdin.read();
			if (chunk !== null) {

				if(chunk.indexOf(",") === 0 && chunk.length > 10){
					chunk = chunk.slice(1);
				}

				try {
					const click = JSON.parse(chunk);
					const id = click.name.replace("block", "");

					status.clickBlock(id, click);
				} catch (e) {
					console.log(e+"");
				}
			}
		});
	}
}

module.exports = function(argv){
	status.init().then(function(){
		i3status.init();
	});
}

