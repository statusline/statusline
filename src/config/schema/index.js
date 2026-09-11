const COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Describes the shape of a config file.
 *
 * Kept as data rather than as code so the error messages, the README and the
 * validation can never drift apart: everything is derived from this one object.
 */
const SCHEMA = {
	blocks: {
		required: true,
		type: "array",
		of: {
			name: {
				required: true,
				type: "string"
			},
			color: {
				type: "color"
			},
			backgroundColor: {
				type: "color"
			},
			customOptions: {
				type: "object"
			}
		}
	},
	middleware: {
		type: "array",
		of: {
			middleware: {
				required: true,
				type: "string"
			},
			options: {
				type: "object"
			}
		}
	}
};

/**
 * Names the type of a value the way the schema does.
 *
 * @param {*} value Value to inspect
 * @returns {string} One of "array", "object", "string", "number", "boolean", "null"
 */
const typeOf = function(value){
	if(value === null){
		return "null";
	}

	if(Array.isArray(value)){
		return "array";
	}

	return typeof value;
};

/**
 * Checks one value against one field definition.
 *
 * @param {*} value Value to check
 * @param {Object} definition Field definition from the schema
 * @param {string} path Dotted path used in error messages
 * @returns {string[]} Error messages, empty when the value is valid
 */
const checkField = function(value, definition, path){
	if(value === undefined){
		if(definition.required){
			return [path + " is required"];
		}

		return [];
	}

	if(definition.type === "color"){
		if(typeOf(value) !== "string" || !COLOR_PATTERN.test(value)){
			return [path + " must be a hex colour like \"#ffffff\", got " + JSON.stringify(value)];
		}

		return [];
	}

	if(typeOf(value) !== definition.type){
		return [path + " must be " + definition.type + ", got " + typeOf(value)];
	}

	if(definition.type !== "array" || !definition.of){
		return [];
	}

	return value.reduce((errors, entry, index) => {
		const entryPath = path + "[" + index + "]";

		if(typeOf(entry) !== "object"){
			return errors.concat([entryPath + " must be object, got " + typeOf(entry)]);
		}

		const known = Object.keys(definition.of);

		const unknown = Object.keys(entry).filter((key) => {
			return known.indexOf(key) === -1 && key !== "id";
		}).map((key) => {
			return entryPath + "." + key + " is not a known option, expected one of: " + known.join(", ");
		});

		const checked = known.reduce((entryErrors, key) => {
			return entryErrors.concat(checkField(entry[key], definition.of[key], entryPath + "." + key));
		}, []);

		return errors.concat(unknown, checked);
	}, []);
};

/**
 * Validates a config object.
 *
 * Returns every problem it finds rather than stopping at the first, so a typo
 * in the last block is reported on the same run as one in the first.
 *
 * @param {*} config Parsed config file contents
 * @returns {string[]} Error messages, empty when the config is valid
 */
const validate = function(config){
	if(typeOf(config) !== "object"){
		return ["config must be object, got " + typeOf(config)];
	}

	const known = Object.keys(SCHEMA);

	const unknown = Object.keys(config).filter((key) => {
		return known.indexOf(key) === -1;
	}).map((key) => {
		return key + " is not a known option, expected one of: " + known.join(", ");
	});

	const checked = known.reduce((errors, key) => {
		return errors.concat(checkField(config[key], SCHEMA[key], key));
	}, []);

	return unknown.concat(checked);
};

module.exports = {
	schema: SCHEMA,
	validate: validate
};
