import { AppConfig } from "../types/AppConfig";
import { pickXSOverlayParameter } from "../util/configPicker";
import { logger } from "../util/logger";
import { generateFormulatedTime } from "../util/util";
import { showToast, ToastAudioType } from "./toast";
import { showXSOverlayNotification } from "./xsoverlayNotification";

export function showNotification(label: string, userNames: string[], isSpecific: boolean, config: AppConfig): void {
    const message = userNames.join(", ");
    const time = generateFormulatedTime(Date.now());
    console.log(`${time} ${label}: ${userNames}`);

    if (config.isToast)
        showToast(message, label, isSpecific ? ToastAudioType.Reminder : ToastAudioType.Default);

    if (config.isXSOverlay)
        showXSOverlayNotification(
            message,
            label,
            pickXSOverlayParameter(config));
}

export function showInitNotification(config: AppConfig): void {
    logger
    const message = "running";
    const title = "VRChat Join Notifier";
    if (config.notificationTypes.length > 0) console.log(`notificationTypes: ${config.notificationTypes.join(" ")}`);
    if (config.specificNames.length > 0) console.log(`specificNames: ${config.specificNames.join(" ")}`);
    callNotificationUtil(config, message, title);
}

export function showNewLogNotification(config: AppConfig, logFileName: string): void {
    const message = `start monitoring from: ${logFileName}`;
    const time = generateFormulatedTime(Date.now());
    console.log(`${time} ${message}`);
    callNotificationUtil(config, message, "VRChat Join Notifier");
}

export function showSuspendLogNotification(config: AppConfig, logFileName: string, birthtime: number, mtime: number): void {
    const message = `stop monitoring from: ${logFileName},  ${generateFormulatedTime(birthtime)} ~ ${generateFormulatedTime(mtime)}`;
    const time = generateFormulatedTime(Date.now());
    console.log(`${time} ${message}`);
    callNotificationUtil(config, message, "VRChat Join Notifier");
}

function callNotificationUtil(config: AppConfig, message: string, title: string) {
    if (config.isToast)
        showToast(message, title);

    if (config.isXSOverlay)
        showXSOverlayNotification(
            message,
            title,
            pickXSOverlayParameter(config));
}
