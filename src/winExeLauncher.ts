import * as path from "path";
import { app } from "./app/app";
import { readConfigFile } from "./app/util/util";

const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json"));
// launcher向け実行ファイルはlauncher側でアップデート処理を行うためnotifier側の機能は無効化する
config.noUpdate = true;
config.noCheckUpdate = true;
app(config);
