const os = require("os");
const exec = require("child_process").exec;
const fs = require("fs");

module.exports = {
	date: {
		render: function(){
			return new Promise((resolve) => {
				resolve({
					text: "  "+new Date().toLocaleDateString() + " "
				});
			});
		}
	},
	ip: {
		render: function(){
			return new Promise((resolve) => {
				let ifaces = os.networkInterfaces();

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
	},
	load: {
		render: function(){
			return new Promise((resolve) => {
				exec("uptime", function(err, stdout) {
					stdout = stdout.replace("\n", "");
					stdout = stdout.split("load average:")[1];
					stdout = stdout.split(", ")[0];

					resolve({
						text: "  "+stdout+" "
					});
				});
			});
		},
	},
	powerline: {
		render: function(){
			return new Promise((resolve) => {
				resolve({
					text: " "
				});
			});
		},
	},
	battery: {
		render: function(){
			return new Promise((resolve) => {
				fs.readFile("/sys/class/power_supply/BAT0/uevent", (err, data) => {
					data = (data+"").split("\n");

					let values = {};

					data.forEach(function(line){
						let value = line.split("=");

						values[value[0]] = value[1];
					});

					let currentEnergy = values["POWER_SUPPLY_ENERGY_NOW"] || values["POWER_SUPPLY_CHARGE_NOW"];
					let maxEnergy = values["POWER_SUPPLY_ENERGY_FULL"] || values["POWER_SUPPLY_CHARGE_FULL"];

					let percentage = Math.round(currentEnergy / maxEnergy * 100);

					if(percentage > 100){
						percentage = 100;
					}

					const icons = {
						"Discharging": "",
						"Charging": "",
						"Full": "",
						"Unknown": ""
					};

					let icon = icons[values["POWER_SUPPLY_STATUS"]] || "";

					resolve({
						text: "  " + icon + " "+percentage+"% "
					});
				});
			});
		}
	}
};

