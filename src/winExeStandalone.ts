import * as path from "path";
import { app } from "./app/app";
import { readConfigFile } from "./app/util/util";

const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json"));
if (process.argv.includes("--no-update")) config.noUpdate = true;
if (process.argv.includes("--no-check-update")) config.noUpdate = true;
app(config);
