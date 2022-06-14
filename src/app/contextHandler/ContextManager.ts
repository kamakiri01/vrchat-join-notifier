import { AppConfig } from "../types/AppConfig";

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
        console.log("remove id:" + id, this.handlers[id]);
        if (!this.handlers[id]) return;
        this.handlers[id] = undefined!;
        delete this.handlers[id];
    }
}

type HandlerFunction = () => void | boolean;
