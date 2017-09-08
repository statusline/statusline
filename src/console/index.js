const logSymbols = require('log-symbols');
const consoleOld = global.console;

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
	normal: consoleOld.log,
	print: function(type, sign, argumentsObject){
		let arguments = argumentsObject;

		var newArguments = Object.keys(arguments).map((key) => {
			return arguments[key];
		});

		newArguments.unshift(sign+" ");

		type.apply(this, newArguments);
	}
}

module.exports = console;

