/**
 * @file util.ts
 * @description Declares lightweight utility functions including console logging wrappers, status area
 * message overlays, and current local time generator.
 */

'use strict';

let DEBUG = parseInt((new URLSearchParams(window.location.search)).get("debug") ?? "0", 10) ? true : false;

const elStatus = $("#status");

/**
 * Log on console if DEBUG is true.
 */
function debug(...args: any[]): void {
    if (!DEBUG) return;
    console.log(...args);
}

/**
 * Show a message in the status area, and also log on console.
 */
function info(...args: any[]): void {
    infoRaw(...args);
    elStatus.delay(3000).fadeOut(1000);
}

/**
 * Same as info(), without debug log, only update the status message.
 */
function infoRaw(...args: any[]): void {
    const message = args.join(" ");

    elStatus.stop(true, true);
    elStatus.show();
    elStatus.text(message);
}

/**
 * Return the current time in "yyyy-mm-dd-hh-mm-ss" format, which is used for
 * midi filenames.
 */
function getCurrentTime(): string {
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    const ret = nowLocal.toISOString();
    return ret.replace("Z", "").replace(/[:T]/g, "-").replace(/\..*$/, "");
}

export function toggleDebug(): void {
    DEBUG = !DEBUG;
    info("Debug log is now " + (DEBUG ? "enabled" : "disabled"));
}

export { DEBUG, debug, info, infoRaw, getCurrentTime };
