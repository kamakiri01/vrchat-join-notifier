import { setInterval } from "timers";

function initStdinMode() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let viewIndex = 0;
    process.stdin.on("data", function(key) {
        const codePoint = key.toString();
        if (codePoint === "\u0003") { // Ctrl-c
            resetStdinMode();
            process.exit();
        }

        //NOTE: 多言語のspaceキー入力を網羅するべき？
        if (codePoint === "\u0020" || codePoint === "\u3000") { // Space or Idepgraphic Space
            viewIndex = (viewIndex + 1) % Object.values(LogSpaceType).length;
            namespaceLogger.use(Object.values(LogSpaceType)[viewIndex]);
        }
    });

    process.on("exit", code => {
        resetStdinMode();
        process.exit(code);
    });

    process.on("SIGINT", () => {
        resetStdinMode();
        process.exit(0);
    })
}

function resetStdinMode() {
    process.stdin.setRawMode(false);
}

export interface NamespaceLoggerLike {
    get(name: string): Logger;
    use(name: string): Logger;
    destroy(name: string): void;
}

class NamespaceLogger implements NamespaceLoggerLike {
    private loggers: {[key: string]: Logger};
    private currentName!: string;

    constructor() {
        this.loggers = {};
        const interval = setInterval(() => { // ウインドウリサイズによってshowHeaderの描画幅がずれてしまう問題への対処
            this.rewrite();
        }, 1000);
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
        const newLogger = this.loggers[name];
        if (this.currentName !== name) {
            this.currentName = name;
            this.rewrite();
        }
        return newLogger;
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
        if (logger.archive.length > 0) console.log(logger.archive);
    }

    private write(name: string, data: string) {
        if (this.currentName === name) console.log(data);
    }

    private rewrite() {
        this.clear();
        this.showHeader();
        if (this.currentName) this.restore(this.loggers[this.currentName]);
    }

    private showHeader() {
        const headlerText = Object.values(LogSpaceType).map((spaceName) => {
            if (spaceName === this.currentName) return spaceName;
            return `\u001B[100m${spaceName}\x1b[0m`; // 灰色背景+黒文字
        }).join(" ");
        const padding = " ".repeat(process.stdout.columns - 1 - Object.values(LogSpaceType).reduce((acc: number, key) => acc + 1 + key.length, 0)) + "";
        console.log(headlerText.concat(`\u001B[100m${padding}\x1b[0m`));
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
        this.archive += `${data}\n`;
    }

    destroy(): void {
        this.archive = "";
        this.writer = undefined!;
    }
}

export const LogSpaceType = {
    Notifier: "notifier", // join/leave通知
    VideoLog: "videoLog", // ビデオプレイヤーログ
    test1: "test1",
    test2: "test2"
} as const;
export type LogSpaceType = typeof LogSpaceType[keyof typeof LogSpaceType];

initStdinMode();
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
