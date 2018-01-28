const EventEmitter = require("events").EventEmitter;
const path = require("path");

const blocks = require("../blocks");
const console = require("../console");
const config = require("../config");
const paths = require("../paths");


const status = {
	blocks: [],
	id: 0,

	emitter: new EventEmitter(),

	log: console.toFile,

	init: function(){
		return new Promise(function(resolve){
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
				module.paths.push(path.join(paths.modulePath, "node_modules"));
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
		return new Promise((resolve) => {
			blocks[block.name].render(block, status).then((result) => {
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
	clickBlock: function(id, click = null){
		status.blocks.forEach(function(block){
			if(block.id == id && blocks[block.name].onClick != undefined){
				blocks[block.name].onClick(click, block, status);
				status.render();
			}
		});
	}
};

module.exports = status;

