const console = require("../console");

const status = {
	blocks: [],
	inited: false,

	render: function(){
		let output = status.blocks.map(status.renderBlock);

		if(!status.inited){
			status.inited = true;

			console.log("{\"version\":1}");
			console.log("[");
			console.log(JSON.stringify(output));
		} else {
			console.log(",", JSON.stringify(output));
		}

	},
	renderBlock(block){
		return {
			"name":"disk_info",
			"instance":"/home",
			"markup":"none",
			"full_text":"   /home 353.0 GiB ",
			"background": "#222222"
		};
	},
	addBlock: function(block){
		status.blocks.push({});
	}
}

module.exports = status;

