import * as path from "path";
import * as fs from "fs";
import { findLatestVRChatLogFullPath, parseVRChatLog, ActivityLog } from "vrchat-activity-viewer";
import { AppConfig, AppParameterObject, OscConfig } from "./types/AppConfig";
import { checkNewExit, checkNewJoin, checkNewLeave, findOwnUserName } from "./checker";
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

const defaultOscConfig: OscConfig = {
    senderIp: "127.0.0.1",
    inPort: "9000",
    timeoutSec: "3",
    generalJoinAddress: undefined!
};

export interface AppContext {
    config: AppConfig;
    currentLogFilePath: string;
    latestCheckIndex: number;
    userName: string | null;
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
        currentLogFilePath: "",
        userName: null,
        latestCheckIndex: 0
    }
}

function generateAppConfig(param: AppParameterObject): AppConfig {
    const config: any = JSON.parse(JSON.stringify(defaultAppConfig));
    (Object.keys(param) as (keyof AppParameterObject)[]).forEach(key => {
        if (param[key] != null) config[key] = param[key];
    })

    if (param.osc && (param.osc.generalJoinAddress || param.osc.specificJoinAddress)) {
        config.osc = JSON.parse(JSON.stringify(defaultOscConfig));
        (Object.keys(param.osc) as (keyof OscConfig)[]).forEach(key => {
            if (param.osc![key] != null) config.osc[key] = param.osc![key];
        })
    } else {
        config.osc = undefined;
    }

    // TODO: notificationTypes が増えたら type を切る
    if (config.notificationTypes.filter((e: string) => {return e !== "join" && e !== "leave";}).length > 0) {
        console.log("unknown config [notificationTypes] found, " + config.notificationTypes);
    }
    return config;
}

function loop(context: AppContext): void {
    try {
        const latestLog = getLatestLog();
        if (!latestLog) return;

        if (latestLog.filePath !== context.currentLogFilePath) {
            context.currentLogFilePath = latestLog.filePath;
            context.latestCheckIndex = 0;
        }

        const notifyInfo = getNotifyInfo(context, latestLog.log);
        context.latestCheckIndex = latestLog.log.length - 1;

        comsumeNewJoin(context, notifyInfo.join.userNames);
        if (isNoNeedToNotifiyLeave(notifyInfo.isOwnExit, context.userName, notifyInfo.leave.userNames)) return;
        consumeNewLeave(context, notifyInfo.leave.userNames);
    } catch (error) {
        if (!context.config.verbose) return;
        console.log("ERR", error);
    }
}

function getNotifyInfo(context: AppContext, latestLog: ActivityLog[]) {
    if (!context.userName) context.userName = findOwnUserName(latestLog);

    const checkJoinResult = (context.config.notificationTypes.indexOf("join") !== -1) ?
        checkNewJoin(latestLog, context.latestCheckIndex) : { userNames: [] };
    const checkLeaveResult = (context.config.notificationTypes.indexOf("leave") !== -1) ?
        checkNewLeave(latestLog, context.latestCheckIndex) : { userNames: [] };
    const isOwnExit = checkNewExit(latestLog, context.latestCheckIndex);

    return {
        isOwnExit,
        join: checkJoinResult,
        leave: checkLeaveResult,
    };
}

function getLatestLog(): { log: ActivityLog[], filePath: string} | null {
    const filePath: string | null = findLatestVRChatLogFullPath();
    if (!filePath) return null; // 参照できるログファイルがない

    return {
        filePath,
        log: parseVRChatLog(
            fs.readFileSync(path.resolve(filePath), "utf8"), false)
    };
}

// 自身の退室時か、leaveユーザ名リストに自身のdisplayNameが含まれる場合は通知しない
function isNoNeedToNotifiyLeave(isOwnExit: boolean, userName: string | null, leaveUserNames: string[]): boolean {
    return isOwnExit || (!!userName && leaveUserNames.indexOf(userName) !== -1);
}
