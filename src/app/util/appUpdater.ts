import fetch, { RequestInit } from "node-fetch";
import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";
import * as unzipper from "unzipper";
import { resolve } from "path";

export async function canUpdate(): Promise<boolean> {
    try {
        const latest = require("../latestJson/latestJson").latestJson as LatestJson;
        const currentVersion = latest.version;
        console.log("latset: ", latest);
    
        const fetchOptions: RequestInit = {
            headers: {
                "User-Agent": "VRChatJoinNotifier-Updater:v" + currentVersion
            } 
        };
        const response = await fetch("https://vrchatjoinnotifier.yie.jp/v1/notifier/latest.json", fetchOptions);
        if (!response.ok) return false;
        const latestJson: LatestJson = await response.json();
        console.log("web latestJson", latestJson, currentVersion < latestJson.version);
        return currentVersion < latestJson.version;
    } catch(error: any) {
        handleProtocolError(error);
        return false;
    }
}

export async function downloadLatest(tmpDirPath: string): Promise<boolean> {
    try {
        const downloadDirPath = path.join(tmpDirPath, "download");
        fs.mkdirSync(downloadDirPath, { recursive: true });
        const response = await fetch("https://vrchatjoinnotifier.yie.jp/v1/notifier/latest.zip");
        console.log("downloadLatest, response.ok: " + response.ok, "response");
        if (!response.ok) return false;
        const savePath = path.join(downloadDirPath, "latest.zip");
        const writeStream = fs.createWriteStream(savePath);

        await new Promise<boolean>((resolve, reject) => {
            response.body.pipe(writeStream);
            response.body.on("error", (err) => {throw err;});
            writeStream.on("finish", () => resolve(true));
        });

        return true;
    } catch(error: any) {
        handleProtocolError(error);
        return false;
    }
}

export async function replaceApp(tmpDirPath: string) {
    console.log("replaceApp");
    const downloadDirPath = path.join(tmpDirPath, "download");
    const extractDirPath = path.join(tmpDirPath, "extract");

    try {
        fs.mkdirSync(extractDirPath);
        await extractZip(
            path.join(downloadDirPath, "latest.zip"),
            extractDirPath
        );

        const extractFiles = fs.readdirSync(extractDirPath);
        const currentAppDir = path.join(__dirname, "../../../");
        console.log("appUpdater __dirname", __dirname);
        console.log("extractFiles", extractFiles, currentAppDir);
    
        await Promise.all(
            extractFiles.map(async (filePath): Promise<void> => {
                const fileName = path.basename(filePath);
                const newFileDestPath = path.join(currentAppDir, fileName);
                try {
                    fs.renameSync(newFileDestPath, newFileDestPath + ".old");
                } catch(error: any) {
                    handleProtocolError(error);
                    // file no conflict
                }
                return new Promise((resolve, reject) => {
                    const newFileSourcePath = path.join(extractDirPath, fileName);
                    // fs.copyFileSync(newFileSourcePath, newFileDestPath);
                    console.log("newFile", newFileSourcePath, newFileDestPath);
                    // NOTE: fs.copyFileSyncの場合、full copy完了前に関数が終了することがあるためcallbackを使う
                    fs.copyFile(newFileSourcePath, newFileDestPath, (err) => {
                        if (err) reject(err);
                        console.log("copyFile callback done", newFileSourcePath);
                        resolve();
                    });
                })
            }
        ));

        console.log("copy done");
    } catch(error: any) {
        handleProtocolError(error);
        return false;
    }
    return true;
}

export function launchUpdatedApp(callback: () => void) {
    var updatedExePath = path.join(__dirname, "../../../", "vrchat-join-notifier.exe");
    console.log("updatedExePath...", updatedExePath);

    var newCmd = child_process.exec("start cmd.exe /K " + updatedExePath);
    newCmd.unref();
    console.log("launchUpdatedApp...done");

    while(!newCmd.pid) {
        console.log("pid no found", newCmd.pid);
    }
    console.log("pid found", newCmd.pid);
    // NOTE: execがcmd.exeを立ち上げるには若干の時間差があり、これより早くcallbackからprocess.exit()を実行した場合、
    // 新しいcmd.exeが立ち上がらないままこのプロセスが終了してしまう。
    // execのPIDは即座に払い出されるがcmdの起動完了を知る手立てが無いため、0.5秒の猶予を待ってからcallbackを呼ぶ。
    setTimeout(() => {
        callback();
    }, 500);

}

async function extractZip(zipFilePath: string, destDirPath: string): Promise<void> {
    console.log("extractZip");
    var readStream = fs.createReadStream(zipFilePath);
    return await new Promise((resolve, reject) => {
        readStream.pipe(unzipper.Extract({ path: destDirPath }));
        console.log("extract");
        readStream.on("error", (err) => {
            console.log("extractZip reject");
            reject(err);
        })
        readStream.on("end", () => {
            console.log("extractZip resolve");
            resolve();
        })        
    })
}

function handleProtocolError(error: Error) {
    // TODO: logging
    console.log("handleProtocolError", error);
}