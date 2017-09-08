const console = require("../console");
const blocks = require("../blocks");

const status = {
	blocks: [],
	inited: false,

	render: function(){
		let output = status.blocks.map(status.renderBlock);

		if(!status.inited){
			status.inited = true;

			console.output("{\"version\":1}");
			console.output("[");
			console.output(JSON.stringify(output));
		} else {
			console.output(",", JSON.stringify(output));
		}

	},
	renderBlock(block){
		var result = blocks(block);

		return {
			"name":"disk_info",
			"instance":"/home",
			"markup":"none",
			"full_text": " "+result.text+" ",
			"color": block.color,
			"background": block.backgroundColor,
			"separator": false,
			"separator_block_width": 0
		};
	},
	addBlock: function(block){
		status.blocks.push(block);
	}
}

module.exports = status;

