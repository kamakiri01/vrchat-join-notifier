import { execSync } from "child_process";
import { AppContext } from "../app";
import { showNotification } from "../notifier/notifier";
import { sendJoinOsc } from "../osc/sender";
import { logger } from "./logger";
import { generateFormulatedTime } from "./util";
import { getVideoTitle, normalizeUrl } from "./videoUtil";

export function comsumeNewJoin(context: AppContext, userNames: string[]): void {
    if (userNames.length === 0) return;

    if (context.config.generalExec) exec(context.config.generalExec, userNames);

    const isSpecific = isIncludeSpecificNames(userNames, context.config.specificNames);
    if (isSpecific && context.config.specificExec) {
        exec(context.config.specificExec, userNames);
    }
    showNotification("join", userNames, isSpecific, context.config);
    if (context.config.osc) sendJoinOsc(context.config.osc);
}

export function consumeNewLeave(context: AppContext, userNames: string[]): void {
    if (userNames.length == 0) return;
    showNotification("leave", userNames, false, context.config);
}

export function consumeVideo(context: AppContext, urls: string[]): void {
    if (urls.length == 0) return;
    const time = generateFormulatedTime(Date.now());
    urls.forEach(url => {
        let title = "";
        const normalizedUrl = normalizeUrl(url);
        try {
            title = getVideoTitle(normalizedUrl, context.config.verbose);
        } catch (e) {
            // do nothing
        }
        logger.videoLog.log(`${time} ${normalizedUrl} ${title}`);
    });
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
