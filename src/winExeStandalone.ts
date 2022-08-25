import * as path from "path";
import { app } from "./app/app";
import { logger } from "./app/util/logger";
import { readConfigFile } from "./app/util/util";

/* eslint-disable @typescript-eslint/no-var-requires */
const packageJson = require("./app/packageJsonReduced/packageJsonReduced").packageJsonReduced as PackageJsonReduced;
logger.notifier.log("notifier running.");
logger.notifier.log(`version: ${packageJson.version}`);

const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json"));
if (process.argv.includes("--no-update")) config.noUpdate = true;
if (process.argv.includes("--no-check-update")) config.noUpdate = true;
app(config);
