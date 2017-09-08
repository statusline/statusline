#!/usr/bin/env node

const fs = require('fs');
const status = require("./i3status");

fs.access('myfile', (err) => {
	if (!err) {
		return;
	}

	fs.open('myfile', 'wx', (err, fd) => {
		if (err) throw err;
		writeMyData(fd);
	});
});

status.addBlock();

setInterval(() => {
	status.render();
}, 1000);

