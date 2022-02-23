import { execSync } from "child_process";
import { AppContext } from "./app";
import { showNotification } from "./notifier/notifier";
import { sendJoinOsc } from "./osc/sender";

export function comsumeNewJoin(context: AppContext): void {
    if (context.newJoinUserNames.length === 0) return;

    if (context.config.generalExec) exec(context.config.generalExec, context.newJoinUserNames);

    const isSpecific = isIncludeSpecificNames(context.newJoinUserNames, context.config.specificNames);
    if (isSpecific && context.config.specificExec) {
        exec(context.config.specificExec, context.newJoinUserNames);
    }
    showNotification("join", context.newJoinUserNames, isSpecific, context.config);
    if (context.config.osc) sendJoinOsc(context.config.osc);

    context.newJoinUserNames = [];
}

export function consumeNewLeave(context: AppContext): void {
    if (context.newLeaveUserNames.length == 0) return;
    if (!!context.userName && context.newLeaveUserNames.indexOf(context.userName) !== -1) {
        context.newLeaveUserNames = [];
        return; // self leave
    }
    showNotification("leave", context.newLeaveUserNames, false, context.config);
    context.newLeaveUserNames = [];
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
