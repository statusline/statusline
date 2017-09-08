module.exports = function(block){
	var blocks = {
		time: function(block){
			return {
				text: new Date() + ""
			}
		}
	};

	if(blocks[block.name]){
		return blocks[block.name]();
	}
}

