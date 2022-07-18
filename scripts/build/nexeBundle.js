const { compile } = require("nexe");

compile({
    input: "lib/winExeStandalone.js",
    output: process.argv[2],
    targets:  "12.18.2",
    resources: ["./thirdparty/yt-dlp/yt-dlp.exe"],
  });
