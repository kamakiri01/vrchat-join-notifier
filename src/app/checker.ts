import { ActivityLog, ActivityType, AuthenticationActivityLog, MoveActivityLog } from "vrchat-activity-viewer";

export function findOwnUserName(latestLog: ActivityLog[]): string | null {
    const userName =
        (latestLog.find(e => e.activityType === ActivityType.Authentication) as AuthenticationActivityLog | undefined)?.userName ??
        (latestLog.filter(e => e.activityType === ActivityType.Join) as MoveActivityLog[]).find(e => e.userData.access === "local")?.userData.userName;
    return userName || null;
}

export function checkNewJoin(latestLog: ActivityLog[], latestCheckIndex: number): CheckResult {
    const newJoinLog = latestLog
        .filter(e => e.activityType === ActivityType.Join)
        .filter((e, index) => (index >= latestCheckIndex));

    if (newJoinLog.length > 0) {
        return {
            userNames: newJoinLog.map(e => (<MoveActivityLog>e).userData.userName)
        }
    }
    return { userNames: [] };
}

export function checkNewLeave(latestLog: ActivityLog[], latestCheckIndex: number): CheckResult {
    const newLeaveLog = latestLog
        .filter(e => e.activityType === ActivityType.Leave)
        .filter((e, index) => (index >= latestCheckIndex));
    if (newLeaveLog.length > 0) {
        return {
            userNames: newLeaveLog.map(e => (<MoveActivityLog>e).userData.userName)
        }
    }
    return { userNames: [] };
}

export function checkNewExit(latestLog: ActivityLog[], latestCheckIndex: number): boolean {
    const newExitLog = latestLog
        .filter(e => e.activityType === ActivityType.Exit)
        .filter((e, index) => (index >= latestCheckIndex));

    return newExitLog.length > 0;
}

interface CheckResult {
    userNames: string[];
}
