import { execSync } from "child_process";
import * as fs from "fs";

// @see https://github.com/nodejs/node/issues/3006
function isTTYEnable(): boolean {
    return process.stdin.isTTY && !!process.stdin.setRawMode;
}

function initStdinMode() {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let viewIndex = 0;
    process.stdin.on("data", function(key) {
        const codePoint = key.toString();
        if (codePoint === "\u0003") { // Ctrl-c
            resetStdinMode();
            process.exit();
        }

        //NOTE: 多言語のspace相当のキー入力を網羅するべき？
        if (codePoint === "\u0020" || codePoint === "\u3000") { // Space or Idepgraphic Space
            viewIndex = (viewIndex + 1) % Object.values(LogSpaceType).length;
            namespaceLogger.use(Object.values(LogSpaceType)[viewIndex]);
        }
    });

    process.on("uncaughtException", (error) => {
        logger.notifier.log(JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
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
        /*
        const interval = setInterval(() => { // ウインドウリサイズによってshowHeaderの描画幅がずれてしまう問題への対処
            this.rewrite();
        }, 1000);
        */
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
        try {
            console.log("\x1BC") // \033c
            console.log("\x1B[EJ") // \033[2J
            if (process.platform === "win32" && process.stdin.isTTY) { // コマンドプロンプトや、Windows Terminalで開いたGit Bashのbash.exe
                execSync('cls', {stdio: 'inherit'});
            } else if (process.platform === "win32") { // git-bash.exe
                const stdout = execSync('clear', {stdio: 'inherit'});
                console.log(stdout);
            } else {
                console.log("\x1B[EJ"); // \033[2J
            }
        } catch (error) {
            logger.notifier.log(JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    }

    private restore(logger: Logger) {
        if (logger.archive.length > 0) console.log(logger.archive);
    }

    private write(name: string, data: string) {
        if (this.currentName === name) console.log(data);
    }

    private rewrite() {
        this.clear();
        // this.showHeader();
        if (this.currentName) this.restore(this.loggers[this.currentName]);
    }

    /**
     * NOTE: write() の記述行数が増えるとターミナルにヘッダを表示できなくなり、スクロールを使いづらくなるため、通常時はヘッダを使用しない
     */
    private showHeader() {
        let currentSpaceIndex = 0;
        const headlerText = Object.values(LogSpaceType)
            .map((spaceName, i) => {
                if (this.currentName === spaceName) currentSpaceIndex = i;
                return spaceName;
            })
            .map((spaceName, i) => {
                const isSpace = spaceName === this.currentName;
                const itemString =
                    (isSpace ? spaceName : `\u001B[100m${spaceName}\u001b[49m`) +
                    ((isSpace || (i+1 === currentSpaceIndex)) ? " " : `\u001B[100m \u001b[49m`);
                return itemString;
            }).join("");
        const padding = " ".repeat((process.stdout.columns - 1 - Object.values(LogSpaceType).reduce((acc: number, key) => acc + 1 + key.length, 0))) + "";
        console.log("\u001b[4m" + headlerText + "\u001b[24m" + `\u001B[100m${padding}\u001b[49m` + "\x1b[0m\n");
    }
}

class FallbackNamespaceLogger implements NamespaceLoggerLike {
    private logger!: Logger;
    constructor() {
        this.logger = new Logger({ writer: (data) => { this.write.bind(this)("__fallback__", data) } });
    }
    get(name: string): Logger {
        return this.logger;
    }
    use(name: string): Logger {
        return this.logger;
    }
    destroy(name: string): void {
        // do nothing
    }

    private write(name: string, data: string) {
        if (name === LogSpaceType.Notifier) console.log(data); // フォールバックではUIを提供できないため従来のnotifier通知のみを出力する
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
        data.split("\n").forEach(line => {
            this.writer(line);
            this.archive += `${line}\n`;
        })
    }

    destroy(): void {
        this.archive = "";
        this.writer = undefined!;
    }
}

export const LogSpaceType = {
    Notifier: "notifier", // join/leave通知
    VideoLog: "videoLog", // ビデオプレイヤーログ
} as const;
export type LogSpaceType = typeof LogSpaceType[keyof typeof LogSpaceType];

let namespaceLogger!: NamespaceLoggerLike;
export type ExportLogger = {[key in LogSpaceType]: Logger};
export let logger!: ExportLogger;

function initLogger() {
    if (isTTYEnable()) {
        initStdinMode();
        namespaceLogger = new NamespaceLogger();
    } else {
        namespaceLogger = new FallbackNamespaceLogger();
    }

    logger = Object.values(LogSpaceType).reduce(
        (acc, key) => {
            return {
                ...acc,
                [key]: namespaceLogger.get(key)
            }
        }, {} as ExportLogger
    );
    namespaceLogger.use(LogSpaceType.Notifier);}

initLogger();
