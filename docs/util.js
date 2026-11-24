/**
 * @file util.ts
 * @description Declares lightweight utility functions including console logging wrappers, status area
 * message overlays, and current local time generator.
 */
'use strict';
var _a;
let DEBUG = typeof window !== 'undefined' && window.location
    ? parseInt((_a = (new URLSearchParams(window.location.search)).get("debug")) !== null && _a !== void 0 ? _a : "0", 10) !== 0
    : false;
function getStatusElement() {
    if (typeof $ === 'undefined') {
        return null;
    }
    return $("#status");
}
/**
 * Log on console if DEBUG is true.
 */
function debug(...args) {
    if (!DEBUG)
        return;
    console.log(...args);
}
/**
 * Show a message in the status area and fade it out after a short delay.
 */
function info(...args) {
    var _a;
    infoRaw(...args);
    (_a = getStatusElement()) === null || _a === void 0 ? void 0 : _a.delay(3000).fadeOut(1000);
}
/**
 * Show a message in the status area immediately without scheduling a fade-out.
 */
function infoRaw(...args) {
    const message = args.join(" ");
    const elStatus = getStatusElement();
    if (!elStatus) {
        return;
    }
    elStatus.stop(true, true);
    elStatus.show();
    elStatus.text(message);
}
/**
 * Return the current time in "yyyy-mm-dd-hh-mm-ss" format, which is used for
 * midi filenames.
 */
function getCurrentTime(nowUtc = new Date()) {
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    const ret = nowLocal.toISOString();
    return ret.replace("Z", "").replace(/[:T]/g, "-").replace(/\..*$/, "");
}
export function setDebug(enabled) {
    DEBUG = enabled;
}
export function toggleDebug() {
    DEBUG = !DEBUG;
    info("Debug log is now " + (DEBUG ? "enabled" : "disabled"));
}
export { DEBUG, debug, info, infoRaw, getCurrentTime };
//# sourceMappingURL=util.js.map