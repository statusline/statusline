const globals = {
	require: "readonly",
	module: "writable",
	process: "readonly",
	console: "readonly",
	global: "writable",
	setInterval: "readonly",
	__dirname: "readonly"
};

module.exports = [
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
			globals: globals
		},
		rules: {
			indent: ["error", "tab"],
			"linebreak-style": ["error", "unix"],
			quotes: ["error", "double"],
			semi: ["error", "always"],
			"no-trailing-spaces": "error",
			"no-param-reassign": "error",
			"no-unused-vars": ["error", {argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_"}],
			"no-var": "error",
			"prefer-const": "error"
		}
	}
];
