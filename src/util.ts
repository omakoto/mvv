'use strict';

const DEBUG = parseInt((new URLSearchParams(window.location.search)).get("debug") ?? "0") ? true : false;

if (!DEBUG) {
    console.log("Debug log is disabled. Use https://omakoto.github.io/mvv/?debug=1 to enable debug log.");
}


// Log on console if DEBUG is true
function debug(...args: any) {
    if (!DEBUG) return;
    console.log(...args);
}

const elStatus = $("#status");

// Show a message in the status area, and also log on console.
function info(...args: any) {
    infoRaw(args);
    elStatus.delay(3000).fadeOut(1000);
}

// Same as info(), without debug log, only update the status message.
function infoRaw(...args: any) {
    let message = args.join(" ");

    elStatus.stop(true, true);
    elStatus.show();
    elStatus.text(message);
}

// "with" equivalent
function w<ArgType>(value: ArgType, callback: (arg: ArgType) => void) {
    callback(value);
}

// Light weight event handling
interface ILiteEvent<T> {
    on(handler: { (data?: T): void }) : void;
    off(handler: { (data?: T): void }) : void;
}

// Light weight event handling
class LiteEvent<T> implements ILiteEvent<T> {
    private handlers: { (data?: T): void; }[] = [];

    public on(handler: { (data?: T): void }) : void {
        this.handlers.push(handler);
    }

    public off(handler: { (data?: T): void }) : void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(data?: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }

    public expose() : ILiteEvent<T> {
        return this;
    }
}

// Return the current time in "yyyy-mm-dd-hh-mm-ss.mmm" format, which is used for
// midi filenames.
function getCurrentTime(): string {
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    let ret = nowLocal.toISOString();
    return ret.replace("Z", "").replaceAll(/[:T]/g, "-").replace(/\..*$/, "");
}

export { DEBUG, debug, info, infoRaw, w, LiteEvent, type ILiteEvent, getCurrentTime };
