"use strict";

const { getBuildInfo } = require("../lib/build-info");

process.stdout.write(`${JSON.stringify(getBuildInfo(), null, 2)}\n`);
