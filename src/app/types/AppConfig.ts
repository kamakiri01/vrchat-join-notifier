/**
 * app が外部から受け取るパラメータ
 * cli prompt から受け取るため全て string
 */
 export interface AppParameterObject {
    interval?: string;
    notificationTypes?: string[];
    specificNames?: string[];
    specificExec?: string;
    generalExec?: string;
    isToast?: boolean;
    isXSOverlay?: boolean;
    xsoverlayVolume?: string;
    xsoverlayOpacity?: string;
    xsoverlayTimeout?: string;
    verbose?: boolean;
    noUpdate?: boolean;
    noCheckUpdate?: boolean;
    osc?: Partial<OscConfig>;
}

/**
 * app 内部の設定管理
 */
export interface AppConfig {
    interval: string;
    notificationTypes: string[];
    specificNames: string[];
    specificExec?: string;
    generalExec?: string;
    isToast: boolean;
    isXSOverlay: boolean;
    xsoverlayVolume: string;
    xsoverlayOpacity: string;
    xsoverlayTimeout: string;
    verbose: boolean;
    noUpdate: boolean;
    noCheckUpdate: boolean;
    osc?: OscConfig;
}

/**
 * @see https://docs.vrchat.com/v2022.1.1/docs/osc-overview
 */
export interface OscConfig {
    senderIp: string;
    inPort: string;
    timeoutSec: string;
    generalJoinAddress: string;
    specificJoinAddress?: string;
}
