import { OscConfig } from "../types/AppConfig";
import { Argument, Message, OscClient } from "./oscClient";

interface ParsedOscConfig {
    senderIp: string;
    inPort: number;
    timeoutSec: number;
    generalJoinAddress: string;
    specificJoinAddress?: string;
}

let client: OscClient;

/**
 * 送信してからresetTime経過していないsendの数
 * この値が0に戻る場合にのみ、0を送信する
 */
 let notifingCountGeneral = 0;
 let notifingCountSpecific = 0;

function parseOscConfig(config: OscConfig): ParsedOscConfig {
    return {
        senderIp: config.senderIp,
        inPort: parseInt(config.inPort, 10),
        timeoutSec: parseFloat(config.timeoutSec),
        generalJoinAddress: config.generalJoinAddress,
        specificJoinAddress: config.specificJoinAddress
    }
}

export function sendJoinOsc(config: OscConfig): void {
    const conf = parseOscConfig(config);
    if (!client) createClient(conf.senderIp, conf.inPort);

    // NOTE: Bundleを検討する余地がある。但し、VRChatのOSCがBundleを正常に処理するかは実装依存である
    // @see https://github.com/vrchat/osccore/tree/all-in-one
    sendOsc(conf.generalJoinAddress, {type: "boolean", value: true})
        .then(async () => {
            notifingCountGeneral += 1;
            await sleep(conf.timeoutSec * 1000);
            notifingCountGeneral -= 1;
            if (notifingCountGeneral === 0) await sendOsc(conf.generalJoinAddress, {type: "boolean", value: false});
        });
    if (conf.specificJoinAddress) sendOsc(conf.specificJoinAddress, {type: "boolean", value: true})
        .then(async () => {
            notifingCountSpecific += 1;
            await sleep(conf.timeoutSec * 1000);
            notifingCountSpecific -= 1;
            if (notifingCountSpecific === 0) await sendOsc(conf.specificJoinAddress!, {type: "boolean", value: false});
        });
}

function sendOsc(address: string, value: Argument): Promise<void> {
    return new Promise((resolve, reject) => {
        const message = new Message(address);
        message.append(value);
        client.send(message, (err: any) => {
          if (err) return reject(err);
          resolve();
        });
    })
}

function createClient(host: string, port: number) {
    client = new OscClient(host, port);
}

const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
