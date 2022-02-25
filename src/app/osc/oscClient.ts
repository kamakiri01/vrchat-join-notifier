import * as dgram from "dgram";
import * as oscMin from "osc-min";

/**
 * reference from @types/node-osc, node-osc
 */

export class Argument {
    type: string;
    value: boolean | number | string;
    constructor(type: string, value: boolean | number | string) {
      this.type = type;
      this.value = value;
    }
  }
  
export class Message {
      oscType: string;
      address: string;
      args: Argument[];
      constructor(address: string) {
        this.oscType = "message";
        this.address = address;
        this.args = [];
    }
    
    append(arg: Argument) {
        this.args.push(arg);
    }
  }

export class OscClient {
    host: string;
    port: number;
    sock: dgram.Socket;
    constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
        this.sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    }

    close(callback?: () => void) {
        this.sock.close(callback);
    }

    send(message: Message, callback: (err?: any) => void) {
        try {
            const buf = oscMin.toBuffer(message);
            this.sock.send(buf, 0, buf.length, this.port, this.host, callback);
        } catch (e: any) {
            throw e;
        }
    }
}
