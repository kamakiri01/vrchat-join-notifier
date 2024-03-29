import * as path from "path";
import * as fs from "fs";
import { findLatestVRChatLogFullPath, parseVRChatLog, ActivityLog } from "vrchat-activity-viewer";
import { AppConfig, AppParameterObject, NotificationTypes, OscConfig } from "./types/AppConfig";
import { checkNewEnter, checkNewExit, checkNewJoin, checkNewLeave, checkNewVideoPlayer, findOwnUserName, isTopazType, isVideoType } from "./util/checker";
import { comsumeNewJoin, consumeEnter, consumeNewLeave, consumeVideo } from "./util/consumer";
import { showInitNotification, showNewLogNotification, showSuspendLogNotification } from "./notifier/notifier";
import { getTmpDir, initTmpDir } from "./util/util";
import * as appUpdater from "./update/appUpdater";
import { launchUpdatedApp } from "./update/launchNewProcess";
import { ContextManager } from "./contextHandler/ContextManager";
import { logger } from "./util/logger";
import { initytDlpExe } from "./util/videoUtil";
import { sendClockOsc } from "./util/clock";
import { createClient } from "./osc/sender";
import { initLogFileWriter } from "./util/logFileWriter";

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
    sendTime: true,
    verbose: false,
    noUpdate: false,
    noCheckUpdate: false,
    logDirPath: ".\\log"
}

const defaultOscConfig: OscConfig = {
    senderIp: "127.0.0.1",
    inPort: "9000",
    timeoutSec: "3",
    generalJoinAddress: "/avatar/parameters/JoinNotifyItem"
};

export interface AppContext {
    config: AppConfig;
    logFilePath: string;
    latestCheckIndex: number;
    userName: string | null;
}

export async function app(param: AppParameterObject): Promise<void> {
    wipeOldFiles();
    await initTmpDir();

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
    initytDlpExe();
    const config = generateAppConfig(param);
    const interval = parseInt(config.interval, 10);
    const manager = new ContextManager({ config });

    initLogFileWriter(config.logDirPath);
    if (config.osc) {
        createClient(config.osc.senderIp, parseInt(config.osc.inPort));
        if (config.sendTime) setOSCClockSender();
    }
    
    showInitNotification(config);
    setInterval(() => {
        loop(manager);
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

    const tmpDirPath = getTmpDir();
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
    // そのため.oldファイルをファイル一覧から見つけることができない
    // vrchat-join-notifier.exeはアップデートの内容に関わらず常に存在するため、特別扱いして常にチェックする
    // TODO: nexe/pkg/その他の実行ファイルの仮想fsからreaddirSyncできる方法を検討する
    const oldExecPath = path.join(currentAppDir, "vrchat-join-notifier.exe.old");
    try {
        fs.unlinkSync(oldExecPath);
    } catch (error: any) {
        // アップデートによって再起動された場合のみ.oldファイルが存在するため、正常系でもこのパスに到達する
    }
}

function generateAppConfig(param: AppParameterObject): AppConfig {
    const config: any = JSON.parse(JSON.stringify(defaultAppConfig));
    (Object.keys(param) as (keyof AppParameterObject)[]).forEach(key => {
        if (param[key] != null) config[key] = param[key];
    })

    if (param.osc) {
        config.osc = JSON.parse(JSON.stringify(defaultOscConfig));
        (Object.keys(param.osc) as (keyof OscConfig)[]).forEach(key => {
            if (param.osc![key] != null) config.osc[key] = param.osc![key];
        })
    } else {
        config.osc = undefined;
    }

    if (config.notificationTypes.filter((e: string) => {return !(Object.values(NotificationTypes) as string[]).includes(e)}).length > 0) {
        logger.notifier.log("unknown config [notificationTypes] found, " + config.notificationTypes);
    }
    return config;
}

function loop(manager: ContextManager) {
    const filePath: string | null = findLatestVRChatLogFullPath();
    if (filePath && !manager.handlers[filePath]) {
        const log = getLog(filePath);
        const isShouldMonitor = !!log && log.length > 0 && !isSuspendedLog(filePath); // 空のログか終了済みログは監視しない
        if (isShouldMonitor) {
            const context = initContext(manager.config, filePath, log);
            if (context.config.verbose) showNewLogNotification(manager.config, path.basename(context.logFilePath));
            manager.add(filePath, () => handlerLoop(context));
        }
    }
    manager.fire();
}

function initContext(config: AppConfig, logFilePath: string, log: ActivityLog[]): AppContext {
    const latestCheckIndex = log ? log.length - 1 : 0;
    return {
        config,
        logFilePath,
        userName: null,
        latestCheckIndex
    }
}

function handlerLoop(context: AppContext): void | boolean {
    try {
        const latestLog = getLog(context.logFilePath);
        if (!latestLog) return;

        const notificationInfo = getNotificationInfo(context, latestLog);
        context.latestCheckIndex = latestLog.length - 1;

        // consumeに時間がかかる場合handlerLoopにかかる時間が伸びるため、handlerLoopの処理が完了しないまま次のhandlerLoopが開始してしまうことがある
        // これを防ぐため時間のかかるconsumeはasyncで行う
        (async () => {
            comsumeNewJoin(context, notificationInfo.join.userNames);
            if (!isNoNeedToNotifiyLeave(notificationInfo.isOwnExit, context.userName, notificationInfo.leave.userNames))
                consumeNewLeave(context, notificationInfo.leave.userNames);
                consumeVideo(context, notificationInfo.video.urls, true);
                consumeVideo(context, notificationInfo.topaz.urls, false);
                consumeEnter(context, notificationInfo.enter.worldNames);
        })();

        const isSuspended = isSuspendedLog(context.logFilePath);
        if (isSuspended) {
            const stat = fs.statSync(context.logFilePath);
            if (context.config.verbose) showSuspendLogNotification(context.config, path.basename(context.logFilePath), stat.birthtimeMs, stat.mtimeMs);
            return isSuspended;
        }
    } catch (error) {
        if (!context.config.verbose) return;
        console.log("ERR", error);
        return true;
    }
}

function getNotificationInfo(context: AppContext, latestLog: ActivityLog[]) {
    if (!context.userName) context.userName = findOwnUserName(latestLog);

    const joinResult = (context.config.notificationTypes.indexOf(NotificationTypes.Join) !== -1) ?
        checkNewJoin(latestLog, context.latestCheckIndex) : { userNames: [] };
    const leaveResult = (context.config.notificationTypes.indexOf(NotificationTypes.Leave) !== -1) ?
        checkNewLeave(latestLog, context.latestCheckIndex) : { userNames: [] };
    const isOwnExit = checkNewExit(latestLog, context.latestCheckIndex);
    const videoResult = checkNewVideoPlayer(latestLog, context.latestCheckIndex, isVideoType);
    const topazResult = checkNewVideoPlayer(latestLog, context.latestCheckIndex, isTopazType);
    const EnterResult = checkNewEnter(latestLog, context.latestCheckIndex);

    return {
        isOwnExit,
        join: joinResult,
        leave: leaveResult,
        video: videoResult,
        topaz: topazResult,
        enter: EnterResult
    };
}

function getLog(filePath: string): ActivityLog[] | null {
    const log = parseVRChatLog(
        fs.readFileSync(path.resolve(filePath), "utf8"), false);
    return log ? log.activityLogList : null;
}

// 自身の退室時か、leaveユーザ名リストに自身のdisplayNameが含まれる場合は通知しない
function isNoNeedToNotifiyLeave(isOwnExit: boolean, userName: string | null, leaveUserNames: string[]): boolean {
    return isOwnExit || (!!userName && leaveUserNames.indexOf(userName) !== -1);
}

/**
 * 更新されていないログかどうか
 */
function isSuspendedLog(filePath: string) {
    const SUSPEND_BORDER_TIME = 60 * 60 * 1000; // 1時間更新が無い場合停止とみなす
    const mtime = fs.statSync(filePath).mtime;
    if ((Date.now() - mtime.getTime()) > SUSPEND_BORDER_TIME) return true;
    return false;
}

function setOSCClockSender() {
    setInterval(() => {
        // Playable sync はリモートには10/sec以上では伝達しない
        // @see https://creators.vrchat.com/avatars/animator-parameters/#sync-types
        const date = new Date();
        sendClockOsc(date);
    }, 100);
}
