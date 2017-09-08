const paths = require("../paths");
const fs = require('fs');

const console = require("../console");

const config = {
	default: {
		blocks: [
			{
				name: "time",
				backgroundColor: "#000000",
				color: "#ffffff"
			}
		]
	},

	loadConfig: function(){
		return new Promise((resolve, reject) => {
			config.exists().then((exists) => {
				if(exists){
					config.loadConfigFile().then(function(config){
						resolve(config);
					});
				} else {
					resolve(config.default);

					config.writeConfigFile(config.default).then(() => {
						console.success("Written default config");
					})
				}
			});
		});
	},

	exists: () => {
		return new Promise((resolve, reject) => {
			fs.access(paths.configFile, (err) => {
				if (!err) {
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	},
	writeConfigFile: (config) => {
		return new Promise((resolve, reject) => {
			fs.writeFile(paths.configFile, JSON.stringify(config, null, 2), (err, fd) => {
				if (err){
					reject(err);
				}

				resolve();
			});
		});
	},
	loadConfigFile: (config) => {
		return new Promise((resolve, reject) => {
			fs.readFile(paths.configFile, (err, data) => {
				if (err){
					reject(err);
				}

				resolve(JSON.parse(data));
			});
		});
	}
};

module.exports = config;

