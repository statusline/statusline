const EventEmitter = require("events").EventEmitter;
const path = require("path");

const blocks = require("../blocks");
const middleware = require("../middleware");
const regions = require("../utils/regions");
const console = require("../console");
const config = require("../config");
const paths = require("../paths");

const COALESCE_DELAY = 8;
const DEFAULT_INTERVAL = 1000;
const CACHE_TOLERANCE = 100;
const WATCHED_INTERVAL = 10000;
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
	watchers: [],
	configWatcher: null,
	region: null,
	only: null,
	cache: {},
	dirty: {},
	id: 0,
	pending: null,

	emitter: new EventEmitter(),

	log: console.toFile,

	/**
	 * Reads the config and prepares every block and middleware it names.
	 *
	 * @returns {Promise} Resolves once the status line is ready to render
	 */
	/**
	 * Limits the status line to one region.
	 *
	 * A command that only draws one region says so before init, and the blocks
	 * of the other regions are never registered at all. Without this, running
	 * one process per region means every process renders every block and throws
	 * most of the work away, including the subscriptions and subprocesses that
	 * work costs.
	 *
	 * @param {?string} region Region to keep, or null for all of them
	 */
	setRegion: function(region){
		status.region = region;
	},

	/**
	 * Limits the status line to a named set of blocks.
	 *
	 * For bars that report clicks per module rather than per block: give a
	 * module one block and its on-click is unambiguous. Without this, a module
	 * wide on-click has to guess, and clicking the clock would act on whichever
	 * block the hook happened to name.
	 *
	 * @param {?string[]} names Block names to keep, or null for all of them
	 */
	setBlocks: function(names){
		status.only = names;
	},

	init: function(){
		status.configWatcher = config.watch(() => {
			status.reload();
		});

		return status.load();
	},

	/**
	 * Rebuilds the status line from the config file.
	 *
	 * Everything is thrown away and built again rather than diffed: a config
	 * reload is rare, and a block that was removed has to lose its subscriptions
	 * and its cached value along with it.
	 *
	 * @returns {Promise} Resolves once the new config has been rendered
	 */
	reload: function(){
		status.stopWatching();

		status.blocks = [];
		status.middleware = [];
		status.cache = {};
		status.dirty = {};
		status.id = 0;

		return status.load().then(() => {
			return status.render();
		});
	},

	/**
	 * Reads the config and prepares every block and middleware it names.
	 *
	 * @returns {Promise} Resolves once the status line is ready to render
	 */
	load: function(){
		return config.loadConfig().then((loaded) => {
			loaded.blocks.forEach((block) => {
				status.addBlock(block);
			});

			(loaded.middleware || []).forEach((entry) => {
				status.addMiddleware(entry);
			});

			status.startWatching();
		});
	},

	/**
	 * Registers a block, loading it from npm when it is not a built-in one.
	 *
	 * @param {Object} block Block entry from the config
	 */
	addBlock: function(block){
		if(status.region !== null && (block.region || regions.defaultRegion) !== status.region){
			return;
		}

		if(status.only !== null && status.only.indexOf(block.name) === -1){
			return;
		}

		if(blocks[block.name] === undefined){
			try {
				blocks[block.name] = loadInstalled(BLOCK_PREFIX + block.name);
			} catch(err) {
				console.error("Block " + block.name + " not found (" + err.message + "). Install it with: statusline install block-" + block.name);

				return;
			}
		}

		const definition = blocks[block.name];

		const watched = definition.watch !== undefined;

		let interval = block.interval || (watched ? WATCHED_INTERVAL : DEFAULT_INTERVAL);

		if(definition.cacheable === false){
			interval = 0;
		}

		status.blocks.push(Object.assign({}, block, {
			id: status.id++,
			interval: interval
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
	 * Subscribes to every block that can say when it has something new.
	 *
	 * A block exporting watch is asking to drive the redraw itself, rather than
	 * waiting to be polled. That is what lets a workspace switch show up
	 * immediately instead of up to an interval later.
	 */
	startWatching: function(){
		status.watchers = status.blocks.map((block) => {
			if(blocks[block.name].watch === undefined){
				return null;
			}

			try {
				return blocks[block.name].watch(block, status);
			} catch(err) {
				console.error("Block " + block.name + " failed to start watching: " + err.message);

				return null;
			}
		}).filter(Boolean);
	},

	/**
	 * Stops every subscription.
	 */
	stopWatching: function(){
		status.watchers.forEach((stop) => {
			stop();
		});

		status.watchers = [];
	},

	/**
	 * Asks for a redraw because something changed.
	 *
	 * Several events often arrive together: switching workspace moves the focus
	 * and changes the title too. Renders are coalesced into the next tick so one
	 * user action costs one render rather than three.
	 *
	 * The timer is deliberately not unref'd. A coalesced render is work that has
	 * been promised, and letting the process exit before it ran would drop it.
	 *
	 * @param {Object} [block] The block that has something new, if it was one
	 * @returns {Promise} Resolves once the render this call belongs to is done
	 */
	update: function(block){
		if(block){
			status.invalidate(block);
		}

		if(status.pending){
			return status.pending;
		}

		status.pending = new Promise((resolve) => {
			setTimeout(() => {
				status.pending = null;

				resolve(status.render());
			}, COALESCE_DELAY);
		});

		return status.pending;
	},

	/**
	 * Throws away a block's cached value, so the next render asks it again.
	 *
	 * @param {Object} block Registered block
	 */
	invalidate: function(block){
		status.dirty[block.id] = true;
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
	 * A block is only asked for a new value once its own interval has passed, or
	 * when it said it had something new. Everything else is served from the last
	 * value it gave. Without this, a redraw triggered by a workspace switch would
	 * also pay for every slow block on the bar: asking pipewire for the volume
	 * and the GPU for its usage costs more than everything else put together, and
	 * neither of them changed because a window got focus.
	 *
	 * A block that throws is rendered as empty rather than being allowed to take
	 * the whole bar down.
	 *
	 * @param {Object} block Registered block
	 * @returns {Promise<Object>} Rendered block
	 */
	renderBlock: function(block){
		const cached = status.cache[block.id];

		const fresh = block.interval > 0 && cached !== undefined && Date.now() - cached.at < block.interval - CACHE_TOLERANCE;

		if(fresh && status.dirty[block.id] !== true){
			return Promise.resolve(cached.output);
		}

		delete status.dirty[block.id];

		return Promise.resolve().then(() => {
			return blocks[block.name].render(block, status);
		}).catch((err) => {
			console.error("Block " + block.name + " failed to render: " + err.message);

			return {
				text: ""
			};
		}).then((result) => {
			const output = {
				name: "block" + block.id,
				instance: block.name,
				markup: result.markup || "none",
				full_text: result.text,
				tooltip: result.tooltip,
				color: block.color,
				background: block.backgroundColor,
				region: block.region,
				separator: false,
				separator_block_width: 0
			};

			status.cache[block.id] = {
				output: output,
				at: Date.now()
			};

			return output;
		});
	},

	/**
	 * Dispatches a click to the block that was clicked, then re-renders.
	 *
	 * A click usually changes the very thing the block reports, so its cached
	 * value is thrown away before the redraw. Otherwise muting would show the
	 * old volume until the block's interval happened to come round.
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
				status.invalidate(block);

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
