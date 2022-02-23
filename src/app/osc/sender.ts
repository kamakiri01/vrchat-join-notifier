import * as osc from "node-osc";
import { OscConfig } from "../types/AppConfig";

let client: osc.Client;

/**
 * 送信してからresetTime経過していないsendの数
 * この値が0に戻る場合にのみ、0を送信する
 */
 let notifingCountGeneral = 0;
 let notifingCountSpecific = 0;

export function sendJoinOsc(config: OscConfig): void {
    if (!client) createClient(config.host, config.sendPort);

    // NOTE: Bundleを検討する余地がある。但し、VRChatのOSCがBundleを正常に処理するかは実装依存である
    // @see https://github.com/vrchat/osccore/tree/all-in-one
    sendOsc(config.generalJoinAddress, {type: "integer", value: 1})
        .then(async () => {
            notifingCountGeneral += 1;
            await sleep(config.resetTime);
            notifingCountGeneral -= 1;
            if (notifingCountGeneral === 0) await sendOsc(config.generalJoinAddress, {type: "integer", value: 0});
        });
    if (config.specificJoinAddress) sendOsc(config.specificJoinAddress, {type: "integer", value: 1})
        .then(async () => {
            notifingCountSpecific += 1;
            await sleep(config.resetTime);
            notifingCountSpecific -= 1;
            if (notifingCountSpecific === 0) await sendOsc(config.specificJoinAddress!, {type: "integer", value: 0});
        });
}

function sendOsc(address: string, value: osc.Argument): Promise<void> {
    return new Promise((resolve, reject) => {
        const message = new osc.Message(address);
        message.append(value);
        client.send(message, (err: any) => {
          if (err) return reject(err);
          resolve();
        });
    })
}

function createClient(host: string, port: number) {
    client = new osc.Client(host, port);
}

const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
