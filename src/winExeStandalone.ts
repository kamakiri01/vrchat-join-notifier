import * as path from "path";
import { app } from "./app/app";
import { logger } from "./app/util/logger";
import { readConfigFile } from "./app/util/util";
import * as fs from "fs";

// NOTE: packageJsonReducedのversionはランチャーのビルドプロセス中にランチャーバージョンで上書きされる
/* eslint-disable @typescript-eslint/no-var-requires */
const packageJson = require("./app/packageJsonReduced/packageJsonReduced").packageJsonReduced as PackageJsonReduced;
logger.notifier.log("notifier running.");
logger.notifier.log(`version: ${packageJson.version}`);

console.log("test1", fs.readdirSync(path.resolve(__dirname, "..")));
console.log("test2", fs.readdirSync(path.resolve(__dirname)));
const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json")); // /src/winExeStandalne.js を
config.osc = {};
console.log("config", config);
if (process.argv.includes("--no-update")) config.noUpdate = true;
if (process.argv.includes("--no-check-update")) config.noUpdate = true;
if (process.argv.includes("--force-launcher-config")) {
// launcher向け実行ファイルはlauncher側でアップデート処理を行うためnotifier側のアップデート機能は無効化する
    config.noUpdate = true;
    config.noCheckUpdate = true;
}

app(config);
