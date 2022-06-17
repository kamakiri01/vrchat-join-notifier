import { execSync } from "child_process";
import { AppContext } from "../app";
import { showNotification } from "../notifier/notifier";
import { sendJoinOsc } from "../osc/sender";

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
