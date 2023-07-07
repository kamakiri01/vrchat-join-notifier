import { sendOsc } from "../osc/sender";

export function sendClockOsc(date: Date) {
    const decimalMoonPhase = getMoonPhaseFromDate(date) / 30;

    const dateTimeSecond = date.getSeconds();
    const dateTimeMinute = date.getMinutes();
    const dateTimeHour = date.getHours();

    const dateTimeSecondF = dateTimeSecond / 60;
    const dateTimeMinuteF = dateTimeMinute / 60;
    const dateTimeHourF = dateTimeHour / 24;

    const dateTimeSecondFA = (date.getSeconds() + date.getMilliseconds() / 1000) / 60;
    const dateTimeMinuteFA = (date.getMinutes() + dateTimeSecondFA) / 60;
    const dateTimeHourFA = (date.getHours() + dateTimeMinuteFA) / 24;

    // NOTE: Bundleを検討する余地がある。但し、VRChatのOSCがBundleを正常に処理するかは実装依存である
    // @see https://github.com/vrchat/osccore/tree/all-in-one
    sendOsc(`/avatar/parameters/${"DateTimeHour"}`, {type: "Int", value: dateTimeHour });
    sendOsc(`/avatar/parameters/${"DateTimeMinute"}`, {type: "Int", value: dateTimeMinute });
    sendOsc(`/avatar/parameters/${"DateTimeSecond"}`, {type: "Int", value: dateTimeSecond });
    sendOsc(`/avatar/parameters/${"DateTimeHourF"}`, {type: "Float", value: dateTimeHourF });
    sendOsc(`/avatar/parameters/${"DateTimeMinuteF"}`, {type: "Float", value: dateTimeMinuteF });
    sendOsc(`/avatar/parameters/${"DateTimeSecondF"}`, {type: "Float", value: dateTimeSecondF });
    sendOsc(`/avatar/parameters/${"DateTimeHourFA"}`, {type: "Float", value: dateTimeHourFA });
    sendOsc(`/avatar/parameters/${"DateTimeMinuteFA"}`, {type: "Float", value: dateTimeMinuteFA });
    sendOsc(`/avatar/parameters/${"DateTimeSecondFA"}`, {type: "Float", value: dateTimeSecondFA });
    sendOsc(`/avatar/parameters/${"Moonphase"}`, {type: "Float", value: decimalMoonPhase});
}

function getMoonPhaseFromDate(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hourCoef = date.getHours() / 23; // 日付変更線で大きく変わらないように小数でも遷移する

    let moonphase = (((year - 2009) % 19) * 11 + month + day);
    if (month < 3) moonphase += 2;
    moonphase = moonphase % 30;
    console.log("sendClockOsc",
        `moonphase: ${moonphase}, hourCoef = ${date.getHours()}/23 = ${hourCoef}, send: ${Math.min(moonphase, 30) + hourCoef}/30 = ${(Math.min(moonphase, 30) + hourCoef)/30}`
    );
    return Math.min(moonphase, 30) + hourCoef;
}
