interface PowertoastParams {
    title: string;
    message: string;
    icon: string;
    audio?: string;
}

type ToBufferFunc = (message: object) => string;

declare module "osc-min" {
	export var toBuffer: ToBufferFunc;
}
