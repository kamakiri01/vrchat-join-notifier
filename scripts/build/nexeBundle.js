const { compile } = require("nexe");

compile({
    input: "lib/winExeStandalone.js",
    output: "vrchat-join-notifier/vrchat-join-notifier.exe",
    targets:  "12.18.2",
    resources: ["./thirdparty/yt-dlp/yt-dlp.exe"],
  });
