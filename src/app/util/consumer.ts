import { execSync } from "child_process";
import { AppContext } from "../app";
import { showNotification } from "../notifier/notifier";
import { sendJoinOsc } from "../osc/sender";
import { logger } from "./logger";
import { generateFormulatedTime } from "./util";
import { getVideoTitle, normalizeUrl } from "./videoUtil";
import { logFileWriter } from "./logFileWriter";

export function comsumeNewJoin(context: AppContext, userNames: string[]): void {
    if (userNames.length === 0) return;
    const isSpecific = isIncludeSpecificNames(userNames, context.config.specificNames);

    if (context.config.generalExec) exec(context.config.generalExec, userNames);
    if (context.config.specificExec && isSpecific) exec(context.config.specificExec, userNames);

    const time = generateFormulatedTime(Date.now());
    showNotification(context.config, time, "join", userNames, isSpecific);
    logFileWriter.writeActivityLog(`${time} join ${userNames}`);
    if (context.config.osc) sendJoinOsc(context.config.osc, isSpecific);
}

export function consumeNewLeave(context: AppContext, userNames: string[]): void {
    if (userNames.length == 0) return;
    const time = generateFormulatedTime(Date.now());
    logFileWriter.writeActivityLog(`${time} leave ${userNames}`);
    showNotification(context.config, time, "leave", userNames, false);
}

export function consumeVideo(context: AppContext, urls: string[], isCheckTitle: boolean): void {
    if (urls.length == 0) return;
    const time = generateFormulatedTime(Date.now());
    urls.forEach(url => {
        let title = "";
        const normalizedUrl = normalizeUrl(url);
        try {
            // NOTE: タイトルを取得できなかったVideoは通知に出ない。
            // 取得の可否はyt-dlpの挙動に依存する。
            title = isCheckTitle ? getVideoTitle(normalizedUrl, context.config.verbose) : "";
            const message = `${time} ${normalizedUrl} ${title}`;
            logger.videoLog.log(message);
            logFileWriter.writeVideoLog(message);
        } catch (e) {
            if (context.config.verbose) console.log("consumeVideo Error", e);
        }
    });
}

export function consumeEnter(_: AppContext, worldNames: string[]): void {
    if (worldNames.length === 0) return;
    const time = generateFormulatedTime(Date.now());
    logFileWriter.writeActivityLog(`${time} enter ${worldNames}`);
}

function isIncludeSpecificNames(names: string[], specificNames: string[]): boolean {
    const lowerNames = names.map(name => name.toLowerCase());
    const matchedNames = specificNames.filter(specificName => lowerNames.find(name => name.indexOf(specificName.toLowerCase()) !== -1));
    return matchedNames.length > 0;
}

function exec(execCommand: string, userNames: string[]) {
    try {
        const stdout = execSync(execCommand.replace("%{{names}}", userNames.join(" ")));
        console.log(stdout.toString());
    } catch (error) {
        console.log(error);
    }
}
