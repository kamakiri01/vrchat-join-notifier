import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";
import { generateFormulatedTime } from "./util";

const ACTIVITY_LOG_FILE_NAME = "joinlog.txt";
const VIDEO_LOG_FILE_NAME = "videolog.txt";

class LogFileWriter {
    isWritable: boolean = false;
    logDirPath: string;
    activityLogStream!: fs.WriteStream;
    videoLogStream!: fs.WriteStream;
    constructor(logDirPath:string) {
        this.logDirPath = logDirPath;
        this._createFileStream();
        this._writeDateLine();
    }

    writeActivityLog(line: string) {
        if (!this.isWritable) return;
        this.activityLogStream.write(`${line}\n`);
    }

    writeVideoLog(line: string) {
        if (!this.isWritable) return;
        this.videoLogStream.write(`${line}\n`);
    }

    private _createFileStream() {
        try {
            fs.accessSync(this.logDirPath);
        } catch (e: any) {
            if (e.code === "ENOENT") {
                fs.mkdirSync(this.logDirPath, { recursive: true });
            } else {
                return; // 未知のエラーの場合はそのまま終了
            }
        }
        try {
            this.activityLogStream = fs.createWriteStream(path.join(this.logDirPath, ACTIVITY_LOG_FILE_NAME), {flags: "a+"});
            this.videoLogStream = fs.createWriteStream(path.join(this.logDirPath, VIDEO_LOG_FILE_NAME), {flags: "a+"});
        } catch (e) {
            logger.notifier.log("requested log file path is invalid. check config and restart app.");
            logger.notifier.log("Error log: " + JSON.stringify(e));
        };
        this.isWritable = true;
    }

    private _writeDateLine() {
        const time = generateFormulatedTime(Date.now());
        this.activityLogStream.write(`\n${time}\n`);
        this.videoLogStream.write(`\n${time}\n`);
    }
}

export let logFileWriter!: LogFileWriter;

export function initLogFileWriter(logDirPath: string) {
    logFileWriter = new LogFileWriter(logDirPath);
}
