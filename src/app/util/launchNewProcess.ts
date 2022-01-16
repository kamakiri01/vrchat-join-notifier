import * as child_process from "child_process";
import * as path from "path";

export function launchUpdatedApp(callback: () => void) {
    var updatedExePath = path.join(__dirname, "../../../", "vrchat-join-notifier.exe");

    var newCmd = child_process.exec("start cmd.exe /K " + updatedExePath);
    newCmd.unref();

    // NOTE: execがcmd.exeを立ち上げるには若干の時間差があり、これより早くcallbackからprocess.exit()を実行した場合、
    // 新しいcmd.exeが立ち上がらないままこのプロセスが終了してしまう。
    // execのPIDは即座に払い出されるがcmd.exeの起動完了を知る手立てが無いため、0.5秒の猶予を待ってからcallbackを呼ぶ。
    setTimeout(() => {
        callback();
    }, 500);
}
