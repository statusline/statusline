const console = require("../console");
const blocks = require("../blocks");

const status = {
	blocks: [],
	inited: false,
	id: 0,

	render: function(){
		let output = status.blocks.map(status.renderBlock);

		Promise.all(output).then((output) => {
			if(!status.inited){
				status.inited = true;

				console.output("{\"version\":1, \"click_events\": true}");
				console.output("[");
				console.output(JSON.stringify(output));
			} else {
				console.output(",", JSON.stringify(output));
			}
		});
	},
	renderBlock(block){
		return new Promise((resolve, reject) => {
			var result = blocks[block.name].render(block, status).then((result) => {
				resolve({
					"name":"block"+block.id,
					"instance":"/home",
					"markup":"none",
					"full_text": result.text,
					"color": block.color,
					"background": block.backgroundColor,
					"separator": false,
					"separator_block_width": 0
				});
			});
		});
	},
	addBlock: function(block){
		block.id = status.id++;
		status.blocks.push(block);
	}
}

process.stdin.on('readable', () => {
	let chunk = process.stdin.read();
	if (chunk !== null) {

		if(chunk.indexOf(",") === 0 && chunk.length > 10){
			chunk = chunk.slice(1);
		}

		try {
			const click = JSON.parse(chunk);
			const id = click.name.replace("block", "");

			status.blocks.forEach(function(block){
				if(block.id == id && blocks[block.name].onClick != undefined){
					blocks[block.name].onClick(click, block, status);
					status.render();
				}
			})
		} catch (e) {
			console.log(e+"");
		}
	}
});

module.exports = status;

