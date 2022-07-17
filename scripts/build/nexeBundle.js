const { compile } = require("nexe");

console.log(process.argv[2])
compile({
    input: "lib/winExeStandalone.js",
    output: process.argv[2],
    targets:  "12.18.2",
    resources: ["./thirdparty/yt-dlp/yt-dlp.exe"],
  });
