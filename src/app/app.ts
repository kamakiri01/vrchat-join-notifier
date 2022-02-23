import * as path from "path";
import * as fs from "fs";
import { findLatestVRChatLogFullPath, parseVRChatLog, ActivityLog } from "vrchat-activity-viewer";
import { AppConfig, AppParameterObject } from "./types/AppConfig";
import { checkNewJoin, checkNewLeave, findOwnUserName } from "./updater";
import { comsumeNewJoin, consumeNewLeave } from "./consumer";
import { showInitNotification } from "./notifier/notifier";
import { initTmpDir } from "./util/util";
import * as appUpdater from "./util/appUpdater";
import { launchUpdatedApp } from "./util/launchNewProcess";

const defaultAppConfig: AppConfig = {
    interval: "2",
    notificationTypes: ["join"],
    specificNames: [],
    specificExec: undefined,
    generalExec: undefined,
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
    wipeOldFiles();

    if (param.noCheckUpdate) {
        _app(param);
    } else if (param.noUpdate) {
        checkUpdate().then(_ => _app(param));
    } else {
        updateApp().then((updated) => {
            if (!updated) return _app(param);
            launchUpdatedApp(() => exitApp());
        });
    }
}

function _app(param: AppParameterObject) {
    const config = generateAppConfig(param);
    const interval = parseInt(config.interval, 10)
    const context = initContext(config);
    showInitNotification(config);
    setInterval(() => {
        loop(context);
    }, interval * 1000);
}

async function checkUpdate(): Promise<boolean> {
    const canUpdate = await appUpdater.canUpdate();
    return canUpdate;
}

async function updateApp(): Promise<boolean> {
    const canUpdate = await appUpdater.canUpdate();
    if (canUpdate) console.log("New update found.");
    if (!canUpdate) return false;

    const tmpDirPath = initTmpDir();
    const successDownload = await appUpdater.downloadLatest(tmpDirPath);
    if (successDownload) console.log("Successful update download.");
    if (!successDownload) return false;

    const successReplace = await appUpdater.replaceApp(tmpDirPath);
    if (successReplace) console.log("Successful update. restarting.");
    if (!successReplace) console.log("Update failed. If this app breaks, re-download latest app.");
    return successReplace;
}

function exitApp() {
    process.exit(0);
}

function wipeOldFiles() {
    const currentAppDir = path.dirname(process.execPath);
    const files = fs.readdirSync(currentAppDir);
    files.forEach(file => {
        const ext = path.extname(file);
        if (ext === ".old") fs.unlinkSync(file);
    })

    // NOTE: nexe環境ではfsモジュールが仮想化されているため、fs.readdirSync()を使用してexecPathディレクトリのファイル一覧を取得することができない
    // vrchat-join-notifier.exeはアップデートの内容に関わらず常に存在するため、特別扱いして常にチェックする
    // TODO: nexe/pkg/その他の実行ファイルの仮想fsからreaddirSyncできる方法を検討する
    const oldExecPath = path.join(currentAppDir, "vrchat-join-notifier.exe.old");
    try {
        fs.unlinkSync(oldExecPath);
    } catch (error: any) {
        // アップデートによって再起動された場合のみ.oldファイルが存在するため、正常系でもこのパスに到達する
    }
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
