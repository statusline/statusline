#!/usr/bin/env node

process.env.SILENT = true;

const fs = require('fs');

const status = require("../i3status");
const config = require("../config");
const console = require("../console");

module.exports = function(argv){
	config.loadConfig().then((config) => {
		config.blocks.forEach(function(block){
			status.addBlock(block);
		});

		setInterval(() => {
			status.render();
		}, 1000);
	})
}

