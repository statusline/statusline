const npm = require('npm-programmatic');
const fs = require('fs');
const path = require("path");

const paths = require("../paths");
const console = require("../console");

const install = {
	install: function(args){
		let promises = args.map(function(package){
			package = "statusline-"+package;

			return new Promise(function(resolve, reject){
				console.log("Installing "+package+"...");
				npm.install([package], {
					cwd:paths.modulePath,
					save:true
				})
				.then(function(){
					console.success("Installed "+package+"...");
					resolve();
				})
				.catch(function(){
					console.error("Error installing "+package+"...");
					reject();
				});
			});
		});

		Promise.all(promises).then(function(){}).catch(function(){});
	}
}

module.exports = function(args){
	if (fs.existsSync(paths.modulePath)) {
		install.install(args);
	} else {
		fs.mkdirSync(paths.modulePath);

		fs.writeFileSync(path.join(paths.modulePath, "package.json"), "{}");

		install.install(args);
	}
}

