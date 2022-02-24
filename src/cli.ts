import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import { app } from "./app/app";
import { readConfigFile } from "./app/util/util";

const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;
program
    .version(version, "-v, --version", "output the current version");

program
    .description("VRChat join notifier")
    .option("-t, --notification-types <type...>", "specific notification type, you can choose join or/and leave")
    .option("-c, --config <filePath>", "specific config file path(you can overwrite from cli. Exclusive other options)")
    .option("-s, --specific-names <name...>", "specific notification names(with another notification sound)")
    .option("-se, --specific-exec <command>", "exec command when match specific names. Replace %{{names}} in command text with join user names")
    .option("-ge, --general-exec <command>", "exec command when any user joined. Replace %{{names}} in command text with join user names")
    .option("-i, --interval <sec>", "specify check interval")
    .option("-nt, --no-toast", "prevent toast notification")
    .option("-nx, --no-xsoverlay", "prevent XSOverlay notification")
    .option("-xv, --xsoverlay-volume <volume>", "XSOverlay notification volume (0~1)")
    .option("-xo, --xsoverlay-opacity <opacity>", "XSOverlay notification opacity (0~1)")
    .option("-xt, --xsoverlay-timeout <sec>", "XSOverlay notification disappear time (sec)")
    .option("-V, --verbose", "display full log details")
    .option("--osc-sender-ip", "OSC destination host")
    .option("--osc-in-port", "OSC destination port")
    .option("--osc-timeout-sec", "time to reset sent OSC parameter")
    .option("--osc-general-join-address <address>", "OSC destination address. (NOTE: msys/MinGW auto convert look like Unix paths[/foo/bar] to Windows[C:\\...]. use MSYS2_ARG_CONV_EXCL or some else)")
    .option("--osc-specific-join-address <address>.", "OSC destination address for specific names")
    // .option("-nu, --no-update", "no update")
    // .option("-nc, --no-check-update", "no check update")

export async function run(argv: any): Promise<void> {
    program.parse(argv);

    let config: any = {};
    if (program["config"]) {
        config = readConfigFile(path.resolve(program["config"]));
    } else {
        config.interval =          program["interval"];
        config.notificationTypes = program["notificationTypes"];
        config.specificNames =     program["specificNames"];
        config.specificExec =      program["specificExec"];
        config.generalExec =       program["generalExec"];
        config.isToast =           program["toast"];
        config.isXSOverlay =       program["xsoverlay"];
        config.xsoverlayVolume =   program["xsoverlayVolume"];
        config.xsoverlayOpacity =  program["xsoverlayOpacity"];
        config.xsoverlayTimeout =  program["xsoverlayTimeout"];
        config.verbose =           program["verbose"];

        if (program["oscGeneralJoinAddress"]) {
            config.osc = {};
            config.osc.senderIp =            program["oscSenderIp"];
            config.osc.inPort =              program["oscInPort"];
            config.osc.timeoutSec =          program["oscTimeoutSec"];
            config.osc.generalJoinAddress  = program["oscGeneralJoinAddress"];
            config.osc.specificJoinAddress = program["oscSpecificJoinAddress"];
        }

        // cli向けアップデート機能は提供していないため無効化する
        config.noUpdate =          true;
        config.noCheckUpdate =     true;
    }

    app(config);
}
