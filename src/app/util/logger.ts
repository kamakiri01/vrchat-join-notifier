process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
let count = 0;
process.stdin.on("data", function(key){
    const codePoint = key.toString();
    if (codePoint === "\u0003") { // Ctrl-c
        process.stdin.setRawMode(false);
        process.exit();
    }

    //NOTE: 多言語のspaceキー入力を網羅するべき？
    if (codePoint === "\u0020" || codePoint === "\u3000") { // Space or Idepgraphic Space
        namespaceLogger.use(Object.values(LogSpaceType)[count]);
        count = (count+1) % 2;
    }
});


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
        if (!this.loggers[name]) this.loggers[name] = new Logger({ writer: (data) => { this.write.bind(this)(name, data) } });
        return this.loggers[name];
    }

    /**
     * 既定のロガーを変更する。
     * ロガーが変更された場合、 Console 描画のリセットを試みる。
     */
    use(name: string): Logger {
        if (!this.loggers[name]) this.get(name);
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

    private write(name: string, data: string) {
        if (this.currentName === name) console.log(data);
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

    private writer: (data: string) => void;

    constructor(param: LoggerParameterObject) {
        this.archive = "";
        this.writer = param.writer;
    }

    log(data: string): void {
        this.writer(data);
        this.archive += `${this.archive.length === 0 ? "" : "\n"}${data}`;
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

const namespaceLogger = new NamespaceLogger();
namespaceLogger.use(LogSpaceType.Notifier);

export type ExportLogger = {[key in LogSpaceType]: Logger};

export const logger: ExportLogger =
    Object.values(LogSpaceType).reduce(
        (acc, key) => {
            return {
                ...acc,
                [key]: namespaceLogger.get(key)
            }
        }, {} as ExportLogger
);
