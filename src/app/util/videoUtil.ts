import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { URL } from "url";
import * as iconv from "iconv-lite";
import { getTmpDir } from "./util";
import * as sea from "node:sea";

export function getVideoTitle(url: string, verbose: boolean): string {
    if (!ytDlpExePath) throw Error();
    // NOTE: 動画ファイル直リンクはyt-dlp.exe自身の出力でWARNINGを出す場合があるため、普段は非表示オプションを付ける
    // Falling back on generic information extractor.
    // URL could be a direct video link, returning it as such.
    const cliOption = " --skip-download --print title" + (verbose ? "" : " --no-warnings");
    try {
        execSync(`${ytDlpExePath} ${cliOption} ${url}`, {stdio: "ignore"}); // yt-dlpのエラー時出力は標準に流れるのでまずignoreでエラー存在確認する
    } catch (error) {
        throw error;
    }
    const buf = execSync(`${ytDlpExePath} ${cliOption} ${url}`);
    return iconv.decode(buf, "Shift_JIS").replace(/\r?\n/g,"");
}

export function normalizeUrl(url: string): string {
    const u = new URL(url);
    if (isYouTube(u.host)) {
        const names: string[] = [];
        u.searchParams.forEach((value, name) => {
            names.push(name); // forEach内でsearchParamsをdeleteすると、ループが回らないnameが生じるため別配列に一時的に格納する
        });
        names.forEach((name) => {
            if (name === "v") return;
            u.searchParams.delete(name); // yt-dlpはv以外のパラメータがある場合パースしないので削除する
        });
    } else if (isRedirectKaraoke(u) && !!u.searchParams.get("url")) {
        return normalizeUrl(new URL(u.searchParams.get("url")!).toString());
    } else if (isRedirectJinnai(u) && !!u.searchParams.get("url")) {
        return normalizeUrl(new URL(u.searchParams.get("url")!).toString());
    } else if (isRedirectJinnaiNext(u) && !!u.searchParams.get("url")) {
        return normalizeUrl(new URL(u.searchParams.get("url")!).toString());
    }
    return u.toString();
}

/**
 * バンドルされた yt-dlp.exe を展開して利用可能にする。
 *
 * VRChat/Tools 以下にある yt-dlp.exe はカスタム版であり、 --print オプションを利用できない。
 * また、そのファイルパスが保持される保証もない。そのため、自前でバイナリをバンドルして抱える。
 */
export function initytDlpExe() {
    try {
        const tmpDirPath = getTmpDir();
        // NOTE: nexe環境ではfsモジュールが仮想化されているため、yt-dlp.exeファイルはzipに同梱せず、nexe compileのresourcesに含めたうえで、
        // 一時ディレクトリに展開する必要がある。
        // また、resourcesに含めたファイルはfs.exists()とreadFileSync()で確認と読み出しができるが、fs.access()でアクセスすることはできない。
        // const exeFile = fs.readFileSync(YT_DLP_EXE_VIRTUAL_PATH);
        let exeFile: Buffer;
        if (sea.isSea()) {
            exeFile = Buffer.from(sea.getAsset("yt-dlp.exe"));
        } else {
            exeFile = fs.readFileSync(YT_DLP_EXE_VIRTUAL_PATH);
        }
        fs.writeFileSync(path.join(tmpDirPath, YT_DLP_EXE_FILENAME), exeFile);
        ytDlpExePath = `${path.join(tmpDirPath, YT_DLP_EXE_FILENAME)}`;
    } catch (e) {
        // do nothing
    }
}

const YT_DLP_EXE_FILENAME = "yt-dlp.exe";
const YT_DLP_EXE_VIRTUAL_PATH = "./thirdparty/yt-dlp/" + YT_DLP_EXE_FILENAME;
let ytDlpExePath: string;

function isYouTube(host: string): boolean {
    return host.includes("youtu.be") || host.includes("youtube.com");
}

// カラオケワールドのリダイレクト対応
function isRedirectKaraoke(url: URL): boolean {
    return url.host.includes("vrckaraoke.0cm.org");
}

// 陣内システムのリダイレクト対応
function isRedirectJinnai(url: URL): boolean {
    return url.host.includes("t-ne.x0.to");
}

function isRedirectJinnaiNext(url: URL): boolean {
    return url.host.includes("nextnex.com");
}
