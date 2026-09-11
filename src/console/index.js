const logSymbols = require("log-symbols");
const fs = require("fs");

const paths = require("../paths");

const consoleOld = global.console;

/**
 * Turns an arguments object into a plain array.
 *
 * @param {Object} argumentsObject Arguments to convert
 * @returns {Array} The same values as an array
 */
const toArray = function(argumentsObject){
	return Array.prototype.slice.call(argumentsObject);
};

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

	/**
	 * Appends a line to the log file.
	 *
	 * Used instead of stdout whenever stdout belongs to a bar protocol, where a
	 * stray log line would corrupt the stream.
	 */
	toFile: function(){
		const line = toArray(arguments).join(" ") + "\n";

		fs.appendFile(paths.logFile, line, () => {});
	},
	normal: function(){
		if(global.SILENT){
			return;
		}

		consoleOld.log.apply(this, toArray(arguments));
	},
	output: consoleOld.log,

	/**
	 * Prints a message with a status symbol in front of it.
	 *
	 * @param {Function} type Function to print with
	 * @param {string} sign Symbol to print in front of the message
	 * @param {Object} argumentsObject Message parts
	 */
	print: function(type, sign, argumentsObject){
		const print = global.SILENT === true ? console.toFile : type;

		print.apply(this, [sign + " "].concat(toArray(argumentsObject)));
	}
};

module.exports = console;
