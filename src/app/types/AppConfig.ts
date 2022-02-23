/**
 * app が外部から受け取るパラメータ
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

export interface OscConfig {
    host: string;
    sendPort: number;
    resetTime: number; // sec単位
    generalJoinAddress: string;
    specificJoinAddress?: string;
}
