const logSymbols = require('log-symbols');
const consoleOld = global.console;
const fs = require("fs");

const paths = require("../paths");

const console = {
	log: function(){
		console.print(consoleOld.log, logSymbols.info, arguments);
	},
	success: function(){
		console.print(consoleOld.log, logSymbols.success, arguments);
	},
	error: function(){
		console.print(consoleOld.error, logSymbols.error, arguments);
	},
	toFile: function(){
		let args = arguments;

		args = Object.keys(args).map(function(argument){
			return args[argument];
		});

		args = args.join(" ")+"\n";

		fs.appendFile(paths.logFile, args, (err) => {});
	},
	normal: function(){
		if(global.SILENT){
			return;
		}

		var newArguments = Object.keys(arguments).map((key) => {
			return arguments[key];
		});

		consoleOld.log.apply(this, newArguments);
	},
	output: consoleOld.log, 
	print: function(type, sign, argumentsObject){
		if(global.SILENT == true){
			type = console.toFile;
		}

		let arguments = argumentsObject;

		var newArguments = Object.keys(arguments).map((key) => {
			return arguments[key];
		});

		newArguments.unshift(sign+" ");

		type.apply(this, newArguments);
	}
}

module.exports = console;

