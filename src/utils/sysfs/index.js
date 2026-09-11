const fs = require("fs");
const path = require("path");

/**
 * Reads a file from sysfs/procfs and resolves with its trimmed contents.
 *
 * @param {string} file Absolute path to read
 * @returns {Promise<string>} Trimmed file contents
 */
const read = function(file){
	return new Promise((resolve, reject) => {
		fs.readFile(file, "utf8", (err, data) => {
			if(err){
				reject(err);

				return;
			}

			resolve(data.trim());
		});
	});
};

/**
 * Reads a KEY=value file (a sysfs uevent, for example) into an object.
 *
 * @param {string} file Absolute path to read
 * @returns {Promise<Object<string, string>>} Parsed key/value pairs
 */
const readKeyValue = function(file){
	return read(file).then((data) => {
		return data.split("\n").reduce((values, line) => {
			const separator = line.indexOf("=");

			if(separator === -1){
				return values;
			}

			return Object.assign({}, values, {
				[line.slice(0, separator)]: line.slice(separator + 1)
			});
		}, {});
	});
};

/**
 * Lists the entries of a directory.
 *
 * @param {string} directory Absolute path to list
 * @returns {Promise<string[]>} Entry names, empty when the directory is missing
 */
const list = function(directory){
	return new Promise((resolve) => {
		fs.readdir(directory, (err, entries) => {
			if(err){
				resolve([]);

				return;
			}

			resolve(entries);
		});
	});
};

module.exports = {
	read: read,
	readKeyValue: readKeyValue,
	list: list,
	join: path.join
};
