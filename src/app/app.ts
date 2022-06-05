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
    latestCheckTime: number;
    latestCheckedInfo: {
        join: string[];
        leave: string[];
    }
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
        latestCheckTime: Date.now(),
        latestCheckedInfo: { join: [], leave: [] },
        userName: null
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

        const unNotifiedContent = checkUnNotifiedContent(context, latestLog);

        comsumeNewJoin(context, unNotifiedContent.join);
        if (isNoNeedToNotifiyLeave(unNotifiedContent.isOwnExit, context.userName, unNotifiedContent.leave)) return;
        consumeNewLeave(context, unNotifiedContent.leave);
    } catch (error) {
        if (!context.config.verbose) return;
        console.log("ERR", error);
    }
}

function checkUnNotifiedContent(context: AppContext, latestLog: ActivityLog[]) {
    if (!context.userName) context.userName = findOwnUserName(latestLog);

    // NOTE: ログファイルの書き込みと読み込みタイミングがバッティングした場合、最新ログを取りこぼすケースが考えられる
    // notifierが取得するログの範囲を最新時刻より手前までの範囲に制限し、バッティングによる取りこぼしを抑制する
    // boundaryTimeより後のログはnotifierに届かないため、latestCheckTimeがboundaryTimeを追い越すことは無い
    const boundaryTime = Date.now() - 500; // バッティング回避マージンとして0.5sec確保する

    const checkJoinResult = (context.config.notificationTypes.indexOf("join") !== -1) ?
        checkNewJoin(latestLog, context.latestCheckTime, boundaryTime) : { userNames: [], latestLogTime: 0 };
    const checkLeaveResult = (context.config.notificationTypes.indexOf("leave") !== -1) ?
        checkNewLeave(latestLog, context.latestCheckTime, boundaryTime) : { userNames: [], latestLogTime: 0 };
    const isOwnExit = checkNewExit(latestLog, context.latestCheckTime, boundaryTime);

    // NOTE: 同時刻のログ行が時間差でログファイルに書き込まれた場合、後から書き込まれたログは latestCheckTime でフィルタされてしまうケースが考えられる
    // この取りこぼしを防ぐため、 latestCheckTime と同じログが後から読み込まれた場合には、未通知の内容であれば通知処理に送る
    // latestCheckTime が更新される都度、未通知/既通知リストをリセットする
    const tmpTime = context.latestCheckTime;
    context.latestCheckTime = Math.max(context.latestCheckTime, checkJoinResult.latestLogTime, checkLeaveResult.latestLogTime);
    if (tmpTime !== context.latestCheckTime) context.latestCheckedInfo = { join: [], leave: [] };
    
    const unNofitiedJoinList = checkJoinResult.userNames.filter(e => !context.latestCheckedInfo.join.includes(e));
    const unNofitiedLeaveList = checkLeaveResult.userNames.filter(e => !context.latestCheckedInfo.leave.includes(e));
    context.latestCheckedInfo = {
        join: Array.from(new Set(context.latestCheckedInfo.join.concat(checkJoinResult.userNames))),
        leave: Array.from(new Set(context.latestCheckedInfo.leave.concat(checkLeaveResult.userNames)))
    };

    return {
        isOwnExit,
        join: unNofitiedJoinList,
        leave: unNofitiedLeaveList
    };
}

function getLatestLog(): ActivityLog[] | null {
    const filePath: string | null = findLatestVRChatLogFullPath();
    if (!filePath) return null; // 参照できるログファイルがない

    return parseVRChatLog(
        fs.readFileSync(path.resolve(filePath), "utf8"), false);
}

// 自身の退室時か、leaveユーザ名リストに自身のdisplayNameが含まれる場合は通知しない
function isNoNeedToNotifiyLeave(isOwnExit: boolean, userName: string | null, leaveUserNames: string[]): boolean {
    return isOwnExit || (!!userName && leaveUserNames.indexOf(userName) !== -1);
}
