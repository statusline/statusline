module.exports = function(block){
	var blocks = {
		time: function(block){
			return new Promise((resolve, reject) => {
				resolve({
					text: new Date() + ""
				});
			});
		},
		battery: function(block){
			return new Promise((resolve, reject) => {
				const fs = require("fs");

				fs.readFile("/sys/class/power_supply/BAT0/uevent", (err, data) => {
					data = (data+"").split("\n");

					let values = {};

					data.forEach(function(line){
						let value = line.split("=");

						values[value[0]] = value[1];
					})

					var percentage = Math.round(values["POWER_SUPPLY_ENERGY_NOW"] / values["POWER_SUPPLY_ENERGY_FULL"] * 100);

					if(percentage > 100){
						percentage = 100;
					}

					resolve({
						text: "Battery left: "+percentage+"%"
					});
				});
			});
		}
	};

	if(blocks[block.name]){
		return blocks[block.name]();
	}
}

