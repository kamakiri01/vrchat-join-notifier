import * as path from "path";
import { app } from "./app/app";
import { readConfigFile } from "./app/util/util";
import { logger } from "./app/util/logger";

/* eslint-disable @typescript-eslint/no-var-requires */
const packageJson = require("./app/packageJsonReduced/packageJsonReduced").packageJsonReduced as PackageJsonReduced;
// NOTE: packageJsonReducedのversionはランチャーのビルドプロセス中にランチャーバージョンで上書きされる
logger.notifier.log("notifier running.");
logger.notifier.log(`version: ${packageJson.version}`);

const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json"));
// launcher向け実行ファイルはlauncher側でアップデート処理を行うためnotifier側のアップデート機能は無効化する
config.noUpdate = true;
config.noCheckUpdate = true;
app(config);
