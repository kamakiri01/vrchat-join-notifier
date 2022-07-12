const { compile } = require("nexe");

compile({
    input: "lib/winExeStandalone.js",
    output: "vrchat-join-notifier/vrchat-join-notifier.exe",
    targets:  "12.18.2",
    resources: ["./yt/yt-dlp.exe"],
  }).then(() => {
    console.log("success nexe export!");
  });
