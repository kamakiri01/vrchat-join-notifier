import { Readable } from "stream";
import * as path from "path";
import * as fs from "fs";
import * as unzipper from "unzipper";

// NOTE: アプリケーションアップデート機能は winExeStandalone 向け機能であり、他の起動元から呼び出してはならない

export async function canUpdate(): Promise<boolean> {
    try {
        /* eslint-disable @typescript-eslint/no-var-requires */
        const latest = require("../latestJson/latestJson").latestJson as LatestJson;
        const currentVersion = latest.version;
        const response = await fetch("https://vrchatjoinnotifier.yie.jp/v2/notifier/latest.json", {
            headers: {
                "User-Agent": "VRChatJoinNotifier-Updater:v" + currentVersion
            },
            signal: AbortSignal.timeout(3000)
        });
        if (!response.ok) return false;
        const latestJson: LatestJson = await response.json() as LatestJson;
        return currentVersion < latestJson.version;
    } catch (error: any) {
        handleProtocolError(error);
        return false;
    }
}

export async function downloadLatest(tmpDirPath: string): Promise<boolean> {
    try {
        const downloadDirPath = path.join(tmpDirPath, "download");
        fs.mkdirSync(downloadDirPath, { recursive: true });
        const response = await fetch("https://vrchatjoinnotifier.yie.jp/v2/notifier/latest.zip");
        if (!response || !response.body || !response.ok) return false;

        const savePath = path.join(downloadDirPath, "latest.zip");
        const writeStream = fs.createWriteStream(savePath);

        await new Promise<boolean>((resolve, reject) => {
            const readableBody = Readable.fromWeb(response.body!);
            readableBody.pipe(writeStream);
            readableBody.on("error", (err) => reject(err));
            writeStream.on("finish", () => resolve(true));
        });

        return true;
    } catch (error: any) {
        handleProtocolError(error);
        return false;
    }
}

export async function replaceApp(tmpDirPath: string): Promise<boolean> {
    const downloadDirPath = path.join(tmpDirPath, "download");
    const extractDirPath = path.join(tmpDirPath, "extract");

    try {
        fs.mkdirSync(extractDirPath);
        await extractZip(
            path.join(downloadDirPath, "latest.zip"),
            extractDirPath
        );
        // NOTE: extractZip が end した後であっても、即時ファイルをコピーすると不完全なバイナリファイルが手に入ることがある。
        // 暫定対策として1秒待つ。秒数に根拠はない
        await (() => {
            return new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
        })();

        const extractFiles = fs.readdirSync(extractDirPath);
        const currentAppDir = path.join(__dirname, "../../../"); // ./lib/app/util/appUpdater.js から ./ への相対パス
        await Promise.all(
            extractFiles.map(async (filePath): Promise<void> => {
                const fileName = path.basename(filePath);
                const newFileDestPath = path.join(currentAppDir, fileName);
                try {
                    fs.renameSync(newFileDestPath, newFileDestPath + ".old");
                } catch (error: any) {
                    // 新しいファイルの場合は旧ファイルがないため、正常系でrenameSyncに失敗する
                }
                return new Promise((resolve, reject) => {
                    const newFileSourcePath = path.join(extractDirPath, fileName);
                    // NOTE: fs.copyFileSyncの場合、full copy完了前に関数が終了することがあるためcallbackを使う
                    fs.copyFile(newFileSourcePath, newFileDestPath, (err) => {
                        if (err) reject(err);
                        // setTimeout(() => resolve(), 1000);
                        resolve();
                    });
                })
            }
        ));
    } catch (error: any) {
        handleProtocolError(error);
        return false;
    }
    return true;
}

async function extractZip(zipFilePath: string, destDirPath: string): Promise<void> {
    const readStream = fs.createReadStream(zipFilePath);
    return await new Promise((resolve, reject) => {
        readStream.pipe(unzipper.Extract({ path: destDirPath }));
        readStream.on("error", (err) => {
            reject(err);
        })
        readStream.on("end", () => {
            resolve();
        })        
    })
}

function handleProtocolError(error: Error) {
    console.log("handleProtocolError", error); // ログ出力のみ
}
