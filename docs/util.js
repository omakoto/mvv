'use strict';
var _a;
var DEBUG = parseInt((_a = (new URLSearchParams(window.location.search)).get("debug")) !== null && _a !== void 0 ? _a : "0") ? true : false;
// if (!DEBUG) {
//     console.log("Debug log is disabled. Use https://omakoto.github.io/mvv/?debug=1 to enable debug log.");
// }
// Log on console if DEBUG is true
function debug(...args) {
    if (!DEBUG)
        return;
    console.log(...args);
}
const elStatus = $("#status");
// Show a message in the status area, and also log on console.
function info(...args) {
    infoRaw(args);
    elStatus.delay(3000).fadeOut(1000);
}
// Same as info(), without debug log, only update the status message.
function infoRaw(...args) {
    let message = args.join(" ");
    elStatus.stop(true, true);
    elStatus.show();
    elStatus.text(message);
}
// "with" equivalent
function w(value, callback) {
    callback(value);
}
// Light weight event handling
class LiteEvent {
    constructor() {
        this.handlers = [];
    }
    on(handler) {
        this.handlers.push(handler);
    }
    off(handler) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }
    trigger(data) {
        this.handlers.slice(0).forEach(h => h(data));
    }
    expose() {
        return this;
    }
}
// Return the current time in "yyyy-mm-dd-hh-mm-ss.mmm" format, which is used for
// midi filenames.
function getCurrentTime() {
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    let ret = nowLocal.toISOString();
    return ret.replace("Z", "").replace(/[:T]/g, "-").replace(/\..*$/, "");
}
export function toggleDebug() {
    DEBUG = !DEBUG;
    info("Debug log is now " + (DEBUG ? "enabled" : "disabled"));
}
export { DEBUG, debug, info, infoRaw, w, LiteEvent, getCurrentTime };
//# sourceMappingURL=util.js.map