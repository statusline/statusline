const EventEmitter = require("events").EventEmitter;
const path = require("path");

const blocks = require("../blocks");
const middleware = require("../middleware");
const console = require("../console");
const config = require("../config");
const paths = require("../paths");

const BLOCK_PREFIX = "statusline-block-";
const MIDDLEWARE_PREFIX = "statusline-middleware-";

/**
 * Loads an installed package from the directory the installer writes to.
 *
 * @param {string} name Full package name
 * @returns {Object} The loaded module
 */
const loadInstalled = function(name){
	module.paths.push(path.join(paths.modulePath, "node_modules"));

	return require(name);
};

const status = {
	blocks: [],
	middleware: [],
	id: 0,

	emitter: new EventEmitter(),

	log: console.toFile,

	/**
	 * Reads the config and prepares every block and middleware it names.
	 *
	 * @returns {Promise} Resolves once the status line is ready to render
	 */
	init: function(){
		return config.loadConfig().then((loaded) => {
			loaded.blocks.forEach((block) => {
				status.addBlock(block);
			});

			(loaded.middleware || []).forEach((entry) => {
				status.addMiddleware(entry);
			});
		});
	},

	/**
	 * Registers a block, loading it from npm when it is not a built-in one.
	 *
	 * @param {Object} block Block entry from the config
	 */
	addBlock: function(block){
		if(blocks[block.name] === undefined){
			try {
				blocks[block.name] = loadInstalled(BLOCK_PREFIX + block.name);
			} catch(err) {
				console.error("Block " + block.name + " not found (" + err.message + "). Install it with: statusline install block-" + block.name);

				return;
			}
		}

		status.blocks.push(Object.assign({}, block, {
			id: status.id++
		}));
	},

	/**
	 * Registers a middleware, loading it from npm when it is not a built-in one.
	 *
	 * @param {Object} entry Middleware entry from the config
	 */
	addMiddleware: function(entry){
		if(middleware[entry.middleware] === undefined){
			try {
				middleware[entry.middleware] = loadInstalled(MIDDLEWARE_PREFIX + entry.middleware);
			} catch(err) {
				console.error("Middleware " + entry.middleware + " not found (" + err.message + "). Install it with: statusline install middleware-" + entry.middleware);

				return;
			}
		}

		status.middleware.push(entry);
	},

	/**
	 * Renders every block, runs the output through the middleware chain and
	 * emits the result.
	 *
	 * @returns {Promise<Object[]>} The emitted output
	 */
	render: function(){
		return Promise.all(status.blocks.map(status.renderBlock)).then((output) => {
			return status.applyMiddleware(output);
		}).then((output) => {
			status.emitter.emit("output", output);

			return output;
		}).catch((err) => {
			console.error("Render failed: " + err.message);

			return [];
		});
	},

	/**
	 * Runs the rendered output through each configured middleware in turn.
	 *
	 * @param {Object[]} output Rendered blocks
	 * @returns {Promise<Object[]>} Transformed output
	 */
	applyMiddleware: function(output){
		return status.middleware.reduce((chain, entry) => {
			return chain.then((current) => {
				return middleware[entry.middleware].apply(current, entry.options || {}, status);
			});
		}, Promise.resolve(output));
	},

	/**
	 * Renders one block into the object an i3bar protocol consumer expects.
	 *
	 * A block that throws is rendered as empty rather than being allowed to take
	 * the whole bar down.
	 *
	 * @param {Object} block Registered block
	 * @returns {Promise<Object>} Rendered block
	 */
	renderBlock: function(block){
		return Promise.resolve().then(() => {
			return blocks[block.name].render(block, status);
		}).catch((err) => {
			console.error("Block " + block.name + " failed to render: " + err.message);

			return {
				text: ""
			};
		}).then((result) => {
			return {
				name: "block" + block.id,
				instance: block.name,
				markup: "none",
				full_text: result.text,
				color: block.color,
				background: block.backgroundColor,
				region: block.region,
				separator: false,
				separator_block_width: 0
			};
		});
	},

	/**
	 * Dispatches a click to the block that was clicked, then re-renders.
	 *
	 * @param {string|number} id Block id taken from the click event
	 * @param {Object} [click] Raw click event
	 * @returns {Promise} Resolves once the click has been handled
	 */
	clickBlock: function(id, click = null){
		const clicked = status.blocks.filter((block) => {
			return "" + block.id === "" + id && blocks[block.name].onClick !== undefined;
		});

		return Promise.all(clicked.map((block) => {
			return Promise.resolve().then(() => {
				return blocks[block.name].onClick(click, block, status);
			}).catch((err) => {
				console.error("Block " + block.name + " failed to handle a click: " + err.message);

				return null;
			});
		})).then(() => {
			return status.render();
		});
	}
};

module.exports = status;
