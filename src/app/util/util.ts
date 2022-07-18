import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parse } from "jsonc-parser";
import { AppParameterObject } from "../types/AppConfig";

export function generateFormulatedTime(date: number): string {
    const dateOption: Intl.DateTimeFormatOptions = {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    };
    return (new Date(date)).toLocaleString(undefined, dateOption);
}

export function readConfigFile(configFilePath: string): AppParameterObject {
    try {
        const config: AppParameterObject = parse(fs.readFileSync(configFilePath, "utf8"));
        return config;
    } catch (error) {
        return {};
    }
}

// NOTE: 複数個所で呼び出すと意図しないファイル削除を行うことがあるため、起動時に生成して以後はパスを返すべき
export function initTmpDir(): string {
    const appTmpPath = path.join(os.tmpdir(), "VRChatJoinNotifier", "notifier");
    try {
        // fs.rmSync(appTmpPath, { recursive: true, force: true }); // over node14
        fs.rmdirSync(appTmpPath, { recursive: true });
        fs.mkdirSync(appTmpPath, { recursive: true });
    } catch (_) {
        // NOTE: 他の VRChatJoinNotifier が起動しているなどの理由で一時フォルダを削除できない場合がある
        // 次回以降の起動時に消えることを期待してこのプロセスでは削除せずエラーも握りつぶす
    }
    const currentAppTmpPath = path.join(appTmpPath, (Date.now()).toString());
    fs.mkdirSync(currentAppTmpPath, { recursive: true });
    return currentAppTmpPath;
}
