var fs = require("fs");
var path = require("path");
var version = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../", "package.json"), "utf8")).version;

var data = `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageJsonReduced = void 0;
var packageJsonReduced = ${JSON.stringify({ version: version })}
exports.packageJsonReduced = packageJsonReduced;
`;
fs.mkdirSync(path.resolve(__dirname, "../../lib/app/packageJsonReduced"), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, "../../lib/app/packageJsonReduced", "packageJsonReduced.js"), data, { encoding: "utf8" });
