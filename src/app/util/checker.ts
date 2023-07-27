import { ActivityLog, ActivityType, AuthenticationActivityLog, EnterActivityLog, MoveActivityLog, SDK2PlayerStartedActivityLog, USharpVideoStartedActivityLog, VideoPlayActivityLog } from "vrchat-activity-viewer";

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
            userNames: Array.from(new Set(newJoinLog.map(e => (<MoveActivityLog>e).userData.userName)))
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
            userNames: Array.from(new Set(newLeaveLog.map(e => (<MoveActivityLog>e).userData.userName)))
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
            urls: Array.from(new Set(newVideoLog.map(e => e.url))) // 同じvideoログを複数出力するワールドがあるため重複をなくす
        }
    }
    return { urls: [] };
}

export function checkNewEnter(latestLog: ActivityLog[], latestCheckIndex: number) {
    const newEnterLog = latestLog
        .filter((_, index) => (index > latestCheckIndex)) // latestCheckIndex の基準を揃えるため、 index を使う filter は最初に行う
        .filter(e => e.activityType === ActivityType.Enter);

    if (newEnterLog.length > 0) {
        return {
            worldNames: Array.from(new Set(newEnterLog.map(e => (<EnterActivityLog>e).worldData.worldName)))
        }
    }
    return { worldNames: [] };
}

function isVideoType(log: ActivityLog): log is VideoPlayActivityLog | SDK2PlayerStartedActivityLog {
    const videoTypes: ActivityType[] = [ActivityType.VideoPlay, ActivityType.SDK2PlayerStarted];
    return videoTypes.includes(log.activityType);
}

interface CheckMoveResult {
    userNames: string[];
}
