import { ActivityLog, ActivityType, AuthenticationActivityLog, MoveActivityLog } from "vrchat-activity-viewer";

export interface CheckResult {
    userNames: string[];
    latestLogTime: number;
}

export function findOwnUserName(latestLog: ActivityLog[]): string | null {
    const userName =
        (latestLog.find(e => e.activityType === ActivityType.Authentication) as AuthenticationActivityLog | undefined)?.userName ??
        (latestLog.filter(e => e.activityType === ActivityType.Join) as MoveActivityLog[]).find(e => e.userData.access === "local")?.userData.userName;
    return userName || null;
}

export function checkNewJoin(latestLog: ActivityLog[], latestCheckTime: number, boundaryTime: number): CheckResult {
    const newJoinLog = latestLog
        .filter(e => e.activityType === ActivityType.Join)
        .filter(e => (e.date > latestCheckTime) && (e.date < boundaryTime));

    if (newJoinLog.length > 0) {
        return {
            userNames: newJoinLog.map(e => (<MoveActivityLog>e).userData.userName),
            latestLogTime: newJoinLog.map(e => e.date).sort().pop()!
        }
    }
    return { userNames: [], latestLogTime: 0 };
}

export function checkNewLeave(latestLog: ActivityLog[], latestCheckTime: number, boundaryTime: number): CheckResult {
    const newLeaveLog = latestLog
        .filter(e => e.activityType === ActivityType.Leave)
        .filter(e => (e.date > latestCheckTime) && (e.date < boundaryTime));

    if (newLeaveLog.length > 0) {
        return {
            userNames: newLeaveLog.map(e => (<MoveActivityLog>e).userData.userName),
            latestLogTime: newLeaveLog.map(e => e.date).sort().pop()!
        }
    }
    return { userNames: [], latestLogTime: 0 };
}

export function checkNewExit(latestLog: ActivityLog[], latestCheckTime: number, boundaryTime: number): boolean {
    const newExitLog = latestLog
        .filter(e => e.activityType === ActivityType.Exit)
        .filter(e => (e.date > latestCheckTime) && (e.date < boundaryTime));

    return newExitLog.length > 0;
}
