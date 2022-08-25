import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parse } from "jsonc-parser";
import { AppParameterObject } from "../types/AppConfig";
import find = require ("find-process");

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

export async function initTmpDir(): Promise<void> {
    const appTmpDirPath = path.join(os.tmpdir(), "VRChatJoinNotifier", "notifier");
    await deleteClosedTmpDirs(appTmpDirPath);

    currentAppTmpPath = path.join(appTmpDirPath, (Date.now()).toString());
    fs.mkdirSync(currentAppTmpPath, { recursive: true });
    writeLockfile();
}

export function getTmpDir(): string {
    return currentAppTmpPath;
}

let currentAppTmpPath: string;

/**
 *
 * 使用済みの一時フォルダを削除する
 * 多重起動した場合の挙動を壊さないために、使用中の一時フォルダは削除しない
 */
async function deleteClosedTmpDirs(appTmpDirPath: string): Promise<void> {
    let dirs: fs.Dirent[];
    try {
        dirs = fs.readdirSync(appTmpDirPath, { withFileTypes: true });
    } catch (error: any) {
        return; // 次回以降の起動時に消えることを期待してこのプロセスでは削除せずエラーも握りつぶす
    }
    const promises = dirs.map(async (dirent) => {
        if (!dirent.isDirectory()) return;
        const targetAppTmpDirPath = path.join(appTmpDirPath, dirent.name);
        const lockfilePath = path.join(targetAppTmpDirPath, "lockfile");
        try {
            fs.existsSync(lockfilePath);
            const lockData = JSON.parse(fs.readFileSync(lockfilePath, "utf-8"));
            if (lockData.pid) {
                const processList = await find("pid", lockData.pid);
                // プロセスが存在すれば、ロックファイルを作成したアプリが使用中。よってフォルダを削除しない
                if (processList.length > 0) return;
            }
        } catch (error: any) {
            // ロックファイルが無い、あるがパース出来ない、pidを読みだせない場合は異常系としてフォルダ削除を試みる
        }
        try {
            fs.rmdirSync(targetAppTmpDirPath, { recursive: true });
        } catch (error) {
            // 次回以降の起動時に消えることを期待してこのプロセスでは削除せずエラーも握りつぶす
        }
    });
    await Promise.all(promises);
}

// NOTE: 多重起動時に一時フォルダを削除して既存アプリを壊さないために、起動時にpidを書いたlockfileを作成する
// 一時フォルダの削除はpidを持つプロセスがあるかで判定する
// fs.open/createWriteStreamしているファイルはnode.jsではファイルロックできない（メモ帳などから上書きはできないがnode.jsから上書き・削除は可能）ため、
// pidの有無を判定処理とする
function writeLockfile() {
    const lockfilePath = path.join(currentAppTmpPath, "lockfile");
    fs.openSync(lockfilePath, "wx+");
    fs.writeFileSync(lockfilePath, JSON.stringify({
        pid: process.pid,
        time: Date.now()
    }));
}
