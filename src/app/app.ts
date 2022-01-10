import * as path from "path";
import * as fs from "fs";
import { findLatestVRChatLogFullPath, parseVRChatLog, ActivityLog } from "vrchat-activity-viewer";
import { AppConfig, AppParameterObject } from "./types/AppConfig";
import { checkNewJoin, checkNewLeave, findOwnUserName } from "./updater";
import { comsumeNewJoin, consumeNewLeave } from "./consumer";
import { showInitNotification } from "./notifier/notifier";
import { initTmpDir } from "./util/util";
import * as appUpdater from "./util/appUpdater";

const defaultAppConfig: AppConfig = {
    interval: "2",
    notificationTypes: ["join"],
    specificNames: null!,
    specificExec: null!,
    generalExec: null!,
    isToast: true,
    isXSOverlay: true,
    xsoverlayVolume: "0.5",
    xsoverlayOpacity: "1.0",
    xsoverlayTimeout: "3.0",
    verbose: false,
    noUpdate: false,
    noCheckUpdate: false
}

export interface AppContext {
    config: AppConfig;
    userName: string | undefined; // ツールを利用するユーザのVRChat名。ログから見つからない場合、 undefined
    latestCheckTime: number;
    newJoinUserNames: string[];
    newLeaveUserNames: string[];
}

export function app(param: AppParameterObject): void {
    console.log("param", param);

    wipeOldFiles();

    if (param.noUpdate) return (() => {
        appUpdater.canUpdate().then(() => _app(param));
    })();

    updateApp().then((updated) => {
        console.log("updated", updated);
        if (!updated) return _app(param);
        appUpdater.launchUpdatedApp(() => {
            exitApp();
        });
    });
}

function _app(param: AppParameterObject) {
    const config = generateAppConfig(param);
    console.log("config", config);
    const interval = parseInt(config.interval, 10)
    const context = initContext(config);
    showInitNotification(config);
    setInterval(() => {
        loop(context);
    }, interval * 1000);
}

async function updateApp(): Promise<boolean> {
    const canUpdate = await appUpdater.canUpdate();
    console.log("canUpdate", canUpdate);
    if (!canUpdate) return false;

    const tmpDirPath = initTmpDir();
    console.log("tmpDirPath", tmpDirPath);
    const successDownload = await appUpdater.downloadLatest(tmpDirPath);
    console.log("successDownload", successDownload);
    if (!successDownload) return false;

    const successReplace = await appUpdater.replaceApp(tmpDirPath);
    console.log("successReplace", successReplace);
    if (!successReplace) console.log("Update failed. If app malfunctioned, re-download latest app.");
    return successReplace;
}

function exitApp() {
    process.exit(0);
}

function wipeOldFiles() {
    const currentAppDir = path.join(__dirname, "../../../");
    const files = fs.readdirSync(currentAppDir);
    console.log("wipeOldFiles __dirname: " + __dirname, "currentAppDir: " + currentAppDir);

    console.log(fs.readdirSync(path.join(__dirname, "../../../../")), path.join(__dirname, "../../../../"))
    console.log(fs.readdirSync(path.join(__dirname, "../../../")), path.join(__dirname, "../../../"))
    console.log(fs.readdirSync(path.join(__dirname, "../../")), path.join(__dirname, "../../"))
    console.log(fs.readdirSync(path.join(__dirname, "../")), path.join(__dirname, "../"))
    console.log(fs.readdirSync(path.join(__dirname, "./")), path.join(__dirname, "./"))

    console.log("files", files);
    files.forEach(file => {
        const ext = path.extname(file);
    })


}

function initContext(config: AppConfig): AppContext {
    return {
        config,
        userName: undefined,
        latestCheckTime: Date.now(),
        newJoinUserNames: [],
        newLeaveUserNames: []
    }
}

function generateAppConfig(param: AppParameterObject): AppConfig {
    const config: any = JSON.parse(JSON.stringify(defaultAppConfig));
    (Object.keys(param) as (keyof AppParameterObject)[]).forEach(key => {
        if (param[key] != null) config[key] = param[key];
    })
    // TODO: notificationTypes が増えたら type を切る
    if (config.notificationTypes.filter((e: string) => {return e !== "join" && e !== "leave";}).length > 0)
        console.log("unknown config [notificationTypes] found, " + config.notificationTypes);
    return config;
}

function loop(context: AppContext): void {
    try {
        const latestLog = getLatestLog();
        if (!latestLog) return;

        // NOTE: ログファイルの書き込みと読み込みタイミングがバッティングした場合、最新ログを取りこぼすケースが考えられる
        // notifierが取得するログの範囲を最新時刻より手前までの範囲に制限し、バッティングによる取りこぼしを抑制する
        // boundaryTimeより後のログはnotifierに届かないため、latestCheckTimeがboundaryTimeを追い越すことは無い
        const boundaryTime = Date.now() - 500; // バッティング回避マージンとして0.5sec確保する
        if (!context.userName) findOwnUserName(latestLog, context);
        if (context.config.notificationTypes.indexOf("join") !== -1) checkNewJoin(latestLog, context, boundaryTime);
        if (context.config.notificationTypes.indexOf("leave") !== -1) checkNewLeave(latestLog, context, boundaryTime);

        comsumeNewJoin(context);
        consumeNewLeave(context);
    } catch (error) {
        if (!context.config.verbose) return;
        console.log("ERR", error);
    }

}

function getLatestLog(): ActivityLog[] | null {
    const filePath: string | null = findLatestVRChatLogFullPath();
    if (!filePath) return null; // 参照できるログファイルがない

    return parseVRChatLog(
        fs.readFileSync(path.resolve(filePath), "utf8"), false);
}
