const config = {
	loadConfig: function(){
		return new Promise((resolve, reject) => {
			config.exists.then((exists) => {
				if(exists){
					config.load().then(function(config){
						resolve(config);
					});
				} else {
					resolve(config.default);

					config.writeConfig(config.default).then(() => {
						console.log("Written default config");
					})
				}
			});
		});
	},
	exists: () => {
		
	}
};

module.exports = config;

