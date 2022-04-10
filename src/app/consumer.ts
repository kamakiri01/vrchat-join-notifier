import { execSync } from "child_process";
import { AppContext } from "./app";
import { showNotification } from "./notifier/notifier";
import { sendJoinOsc } from "./osc/sender";
import { CheckResult } from "./updater";

export function comsumeNewJoin(context: AppContext, checkResult: CheckResult): void {
    if (checkResult.userNames.length === 0) return;

    if (context.config.generalExec) exec(context.config.generalExec, checkResult.userNames);

    const isSpecific = isIncludeSpecificNames(checkResult.userNames, context.config.specificNames);
    if (isSpecific && context.config.specificExec) {
        exec(context.config.specificExec, checkResult.userNames);
    }
    showNotification("join", checkResult.userNames, isSpecific, context.config);
    if (context.config.osc) sendJoinOsc(context.config.osc);
}

export function consumeNewLeave(context: AppContext, checkResult: CheckResult): void {
    if (checkResult.userNames.length == 0) return;
    showNotification("leave", checkResult.userNames, false, context.config);
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
