module.exports = function(block){
	var blocks = {
		time: function(block){
			return new Promise((resolve, reject) => {
				resolve({
					text: "  "+new Date().toLocaleDateString() + " "
				});
			});
		},
		date: function(block){
			return new Promise((resolve, reject) => {
				resolve({
					text: "  "+new Date().toLocaleTimeString() + " "
				});
			});
		},
		ip: function(block){
			return new Promise((resolve, reject) => {
				var os = require('os');
				var ifaces = os.networkInterfaces();

				delete ifaces["lo"];

				ifaces = Object.keys(ifaces).map(function(iface){
					return ifaces[iface][0].address;
				});

				ifaces = ifaces.join(", ");

				resolve({
					text: "  "+ifaces+" "
				});
			});
		},
		load: function(block){
			return new Promise((resolve, reject) => {
				var exec = require('child_process').exec;

				exec("uptime", function(err, stdout, stderr) {
					stdout = stdout.replace("\n", "");
					stdout = stdout.split("load average:")[1];
					stdout = stdout.split(", ")[0];

					resolve({
						text: "  "+stdout+" "
					});
				});
			});
		},
		powerline: function(block){
			return new Promise((resolve, reject) => {
				resolve({
					text: ""
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
						text: " : "+percentage+"% "
					});
				});
			});
		}
	};

	if(blocks[block.name]){
		return blocks[block.name]();
	}
}

