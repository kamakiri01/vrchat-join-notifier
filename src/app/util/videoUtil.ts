import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { URL } from "url";
import * as iconv from "iconv-lite";
import { initTmpDir } from "./util";

const YT_DLP_EXE_FILENAME = "yt-dlp.exe";
const YT_DLP_EXE_VIRTUAL_PATH = "./thirdparty/yt-dlp/" + YT_DLP_EXE_FILENAME;
let ytDlpExePath: string;

/**
 * バンドルされた yt-dlp.exe を展開して利用可能にする。
 *
 * VRChat/Tools 以下にある yt-dlp.exe はカスタム版であり、 --print オプションを利用できない。
 * また、そのファイルパスが保持される保証もない。そのため、自前でバイナリをバンドルして抱える。
 */
function initExe() {
    try {
        const tmpDirPath = initTmpDir();
        // NOTE: nexe環境ではfsモジュールが仮想化されているため、yt-dlp.exeファイルはzipに同梱せず、nexe compileのresourcesに含めたうえで、
        // 一時ディレクトリに展開する必要がある。
        // また、resourcesに含めたファイルはfs.exists()とreadFileSync()で確認と読み出しができるが、fs.access()でアクセスすることはできない。
        const exeFile = fs.readFileSync(YT_DLP_EXE_VIRTUAL_PATH);
        fs.writeFileSync(path.join(tmpDirPath, YT_DLP_EXE_FILENAME), exeFile);
        ytDlpExePath = `${path.join(tmpDirPath, YT_DLP_EXE_FILENAME)} --skip-download --print title`;
    } catch (e) {
        // do nothing
    }
}

function normalizeURL(url: string) {
    const u = new URL(url);
    if (isYouTube(url)) {
        u.searchParams.forEach((_, key) => {
            if (key === "v") return;
            u.searchParams.delete(key);
        });
    }
    return u.toString();
}

function isYouTube(host: string) {
    return host.indexOf("youtu.be") || host.indexOf("youtube.com");
}

export function getVideoTitle(url: string): string {
    if (!ytDlpExePath) throw Error();
    const buf = execSync(`${ytDlpExePath} ${normalizeURL(url)}`);
    return iconv.decode(buf, "Shift_JIS").replace(/\r?\n/g,"");
}

initExe();
