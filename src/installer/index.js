const npm = require("npm-programmatic");
const fs = require("fs");
const path = require("path");

const paths = require("../paths");
const console = require("../console");

if(!fs.existsSync(paths.modulePath)) {
	fs.mkdirSync(paths.modulePath);

	fs.writeFileSync(path.join(paths.modulePath, "package.json"), "{}");
}

const install = {
	install: function(args){
		let promises = args.map(function(package){
			package = "statusline-"+package;

			return new Promise(function(resolve, reject){
				console.log("Installing "+package+"...");
				npm.install([package], {
					cwd:paths.modulePath,
					save:true
				}).then(function(){
					console.success("Installed "+package+"...");
					resolve();
				}).catch(function(){
					console.error("Error installing "+package+"...");
					reject();
				});
			});
		});

		Promise.all(promises).then(function(){}).catch(function(){});
	},
	uninstall: function(args){
		let promises = args.map(function(package){
			package = "statusline-"+package;

			return new Promise(function(resolve, reject){
				console.log("Unstalling "+package+"...");
				npm.install([package], {
					cwd:paths.modulePath,
					save:true
				}).then(function(){
					console.success("Unstalled "+package+"...");
					resolve();
				}).catch(function(){
					console.error("Error uninstalling "+package+"...");
					reject();
				});
			});
		});

		Promise.all(promises).then(function(){}).catch(function(){});
	}
};

module.exports = install;
