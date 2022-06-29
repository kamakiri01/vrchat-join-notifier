import { AppConfig } from "../types/AppConfig";
import { logger } from "../util/logger";
import { generateFormulatedTime } from "../util/util";

export interface ContextManagerParameterObject {
    config: AppConfig;
}

export class ContextManager {
    config: AppConfig;
    handlers: {[key: string]: HandlerFunction};
    constructor(param: ContextManagerParameterObject) {
        this.config = param.config;
        this.handlers = {};
    }

    add(id: string, func: HandlerFunction) {
        if(this.config.verbose) {
            const time = generateFormulatedTime(Date.now());
            logger.notifier.log(`${time} add log name: ${id}`);
        }
        if (this.handlers[id]) return;
        this.handlers[id] = func;
    }

    fire() {
        if (!this.handlers || Object.keys(this.handlers).length === 0) return;
        Object.keys(this.handlers).forEach((key) => {
            if (this.handlers[key]()) this.remove(key);
        });
    }

    remove(id: string) {
        if(this.config.verbose) {
            const time = generateFormulatedTime(Date.now());
            logger.notifier.log(`remove log name: ${id}`);
        }
        if (!this.handlers[id]) return;
        this.handlers[id] = undefined!;
        delete this.handlers[id];
    }
}

type HandlerFunction = () => void | boolean;
