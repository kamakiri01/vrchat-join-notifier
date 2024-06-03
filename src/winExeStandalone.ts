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

// nexeの場合、/src/winExeStandalne.js からの相対パスとして..を経由する。seaの場合、bundleされるためsrcパスの階層は消える
const config = readConfigFile(path.resolve(__dirname, ".", "join-notifier.json"));
if (process.argv.includes("--no-update")) config.noUpdate = true;
if (process.argv.includes("--no-check-update")) config.noUpdate = true;
if (process.argv.includes("--force-launcher-config")) {
// launcher向け実行ファイルはlauncher側でアップデート処理を行うためnotifier側のアップデート機能は無効化する
    config.noUpdate = true;
    config.noCheckUpdate = true;
}

app(config);
