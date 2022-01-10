import * as path from "path";
import { app } from "./app/app";
import { readConfigFile } from "./app/util/util";

const config = readConfigFile(path.resolve(__dirname, "..", "join-notifier.json"));
// winExeStandalone起動時限定機能のためcliでは必ず無効化する
config.noUpdate = true;
config.noCheckUpdate = true;
app(config);
