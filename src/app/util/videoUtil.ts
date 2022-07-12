import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as iconv from "iconv-lite";
import { initTmpDir } from "./util";

const YT_DLP_EXE_FILENAME = "yt-dlp.exe";
const YT_DLP_EXE_PATH = "./yt/" + YT_DLP_EXE_FILENAME;
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
        // NOTE: nexe環境ではfsモジュールが仮想化されているため、exeファイルはnexe compileのresourcesに含める必要がある。
        // また、resourcesに含めたファイルはfs.exists()とreadFileSync()で確認と読み出しができるが、fs.access()でアクセスすることはできない。
        const exeFile = fs.readFileSync(YT_DLP_EXE_PATH);
        fs.writeFileSync(path.join(tmpDirPath, YT_DLP_EXE_FILENAME), exeFile);
        ytDlpExePath = `${path.join(tmpDirPath, YT_DLP_EXE_FILENAME)} --skip-download --print title`;
    } catch (e) {
        // do nothing
    }
}

export function getVideoTitle(url: string): string {
    if (!ytDlpExePath) throw Error();
    const buf = execSync(`${ytDlpExePath} ${url}`);
    return iconv.decode(buf, "Shift_JIS");
}

initExe();
