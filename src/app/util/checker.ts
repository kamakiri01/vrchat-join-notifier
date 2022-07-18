import { ActivityLog, ActivityType, AuthenticationActivityLog, MoveActivityLog, SDK2PlayerStartedActivityLog, USharpVideoStartedActivityLog, VideoPlayActivityLog } from "vrchat-activity-viewer";

export function findOwnUserName(latestLog: ActivityLog[]): string | null {
    const userName =
        (latestLog.find(e => e.activityType === ActivityType.Authentication) as AuthenticationActivityLog | undefined)?.userName ??
        (latestLog.filter(e => e.activityType === ActivityType.Join) as MoveActivityLog[]).find(e => e.userData.access === "local")?.userData.userName;
    return userName || null;
}

export function checkNewJoin(latestLog: ActivityLog[], latestCheckIndex: number): CheckMoveResult {
    const newJoinLog = latestLog
        .filter((_, index) => (index > latestCheckIndex)) // latestCheckIndex の基準を揃えるため、 index を使う filter は最初に行う
        .filter(e => e.activityType === ActivityType.Join);

    if (newJoinLog.length > 0) {
        return {
            userNames: newJoinLog.map(e => (<MoveActivityLog>e).userData.userName)
        }
    }
    return { userNames: [] };
}

export function checkNewLeave(latestLog: ActivityLog[], latestCheckIndex: number): CheckMoveResult {
    const newLeaveLog = latestLog
        .filter((_, index) => (index > latestCheckIndex))
        .filter(e => e.activityType === ActivityType.Leave);
    if (newLeaveLog.length > 0) {
        return {
            userNames: newLeaveLog.map(e => (<MoveActivityLog>e).userData.userName)
        }
    }
    return { userNames: [] };
}

export function checkNewExit(latestLog: ActivityLog[], latestCheckIndex: number): boolean {
    const newExitLog = latestLog
        .filter((_, index) => (index > latestCheckIndex))
        .filter(e => e.activityType === ActivityType.Exit);

    return newExitLog.length > 0;
}

export function checkNewVideoPlayer(latestLog: ActivityLog[], latestCheckIndex: number) {
    const newVideoLog = latestLog
        .filter((_, index) => (index > latestCheckIndex))
        .filter(isVideoType);
    if (newVideoLog.length > 0) {
        return {
            urls: newVideoLog.map(e => e.url)
        }
    }
    return { urls: [] };
}

function isVideoType(log: ActivityLog): log is VideoPlayActivityLog | USharpVideoStartedActivityLog | SDK2PlayerStartedActivityLog {
    const videoTypes: ActivityType[] = [ActivityType.SDK2PlayerStarted, ActivityType.VideoPlay];
    return videoTypes.includes(log.activityType);
}

interface CheckMoveResult {
    userNames: string[];
}
