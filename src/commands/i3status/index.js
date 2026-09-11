#!/usr/bin/env node

const status = require("../../status");
const console = require("../../console");
const regions = require("../../utils/regions");

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
	/**
	 * Prints one line of the i3bar protocol.
	 *
	 * The protocol has no notion of regions: the status area is a single strip
	 * against the right of the bar, which is why i3 and sway draw workspaces
	 * themselves on the left. Blocks are emitted grouped by region so the order
	 * stays predictable, but nothing is aligned.
	 *
	 * @param {Object[]} output Rendered blocks
	 */
	render: function(output){
		const grouped = regions.group(output);

		const ordered = regions.order.reduce((blocks, region) => {
			return blocks.concat(grouped[region]);
		}, []);

		console.output(", " + JSON.stringify(ordered));
	},
	listenForClicks: function(){
		process.stdin.on("readable", () => {
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
};

module.exports = function(){
	status.init().then(function(){
		i3status.init();
	});
};

