const EventEmitter = require('events').EventEmitter;

const blocks = require("../blocks");
const console = require("../console");
const config = require("../config");


const status = {
	blocks: [],
	id: 0,

	emitter: new EventEmitter(),

	init: function(){
		return new Promise(function(resolve, reject){
			config.loadConfig().then((config) => {
				config.blocks.forEach(function(block){
					status.addBlock(block);
				});

				resolve();
			});
		});
	},
	addBlock: function(block){
		if(blocks[block.name] == undefined){
			try{
				blocks[block.name] = require("statusline-block-"+block.name);
			} catch(e) {
				console.error("Block "+block.name+" not found.");
				process.exit();
			}
		}

		block.id = status.id++;
		status.blocks.push(block);
	},

	render: function(){
		let output = status.blocks.map(status.renderBlock);

		Promise.all(output).then((output) => {
			status.emitter.emit("output", output);
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
	clickBlock: function(id){
		status.blocks.forEach(function(block, click = null){
			if(block.id == id && blocks[block.name].onClick != undefined){
				blocks[block.name].onClick(click, block, status);
				status.render();
			}
		})
	}
}

module.exports = status;

