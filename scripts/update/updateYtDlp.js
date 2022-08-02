/**
 * @reference https://github.com/microlinkhq/youtube-dl-exec/blob/6ed35fa2f7fe057b79c13115110537c331de0bc2/scripts/postinstall.js
 */

const { default: fetch } = require("node-fetch");
const path = require("path");
const fs = require("fs");

const YT_DLP_HOST = "https://api.github.com/repos/yt-dlp/yt-dlp/releases?per_page=1";
const YT_DLP_FILENAME = "yt-dlp.exe";
const YOUTUBE_DL_PATH = path.join(__dirname, "..", "..", "thirdparty", "yt-dlp", YT_DLP_FILENAME);

async function getBinary(url) {
    const response = await fetch(url);
    const [{ assets, name }] = await response.json();
    console.log(`downloading ${name}...`);
    const { browser_download_url: downloadUrl } = assets.find(
        ({ name }) => name === "yt-dlp.exe"
    );

    return fetch(downloadUrl).then(res => res.buffer());
}

getBinary(YT_DLP_HOST).then(buffer => {
    fs.writeFileSync(YOUTUBE_DL_PATH, buffer, { mode: 0o755 });
    console.log("update completed");
})
