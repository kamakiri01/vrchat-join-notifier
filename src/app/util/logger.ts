class NamespaceLogger {
    private loggers: {[key: string]: Logger};
    private currentName!: string;

    constructor() {
        this.loggers = {};
    }

    /**
     * ロガーを取得する。
     * falsy な名前が指定された場合、デフォルトのロガーを返す。
     */
    get(name: string): Logger {
        if (!name) name = "";
        if (!this.loggers[name]) this.loggers[name] = new Logger({ writer: this.write.bind(this) });
        return this.loggers[name];
    }

    /**
     * 既定のロガーを変更する。
     * ロガーが変更された場合、 Console 描画のリセットを試みる。
     */
    use(name: string): Logger {
        if (!name || !this.loggers[name]) this.get(name);
        const currentLogger = this.loggers[name];
        if (this.currentName !== name) {
            this.clear();
            this.restore(currentLogger);
            this.currentName = name;
        }
        return currentLogger;
    }

    /**
     * ロガーを削除する。
     */
    destroy(name: string): void {
        if (!name || !this.loggers[name]) return;
        this.loggers[name].destroy();
        this.loggers[name] = undefined!;
        delete this.loggers[name];
    }

    private clear() {
        console.clear();
    }

    private restore(logger: Logger) {
        console.log(logger.archive);
    }

    private write(data: string) {
        console.log(data);
    }
}

interface LoggerParameterObject {
    writer: (data: string) => void;
}

class Logger {
    /**
     * 改行区切りで過去のログを保持する
     */
    archive: string;

    writer: (data: string) => void;
    constructor(param: LoggerParameterObject) {
        this.archive = "";
        this.writer = param.writer;
    }

    log(data: string): void {
        this.writer(data);
        this.archive += `${this.archive.length === 0 ? "" : "\n"}${data}`;
    }

    wipe(): void {
        this.archive = "";
    }

    destroy(): void {
        this.archive = "";
        this.writer = undefined!;
    }
}

export const LogSpaceType = {
    Notifier: "notifier", // join/leave通知
    VideoInfo: "videoInfo", // ビデオプレイヤーログ
} as const;
export type LogSpaceType = typeof LogSpaceType[keyof typeof LogSpaceType];

export const logger: {[key: string]: Logger} = {};

const namespaceLogger = new NamespaceLogger();
Object.keys(LogSpaceType).forEach(key => {
    const logType = LogSpaceType[key];
    logger[key] = namespaceLogger.get(key);
})
logger[LogSpaceType.Notifier].log("START!");
