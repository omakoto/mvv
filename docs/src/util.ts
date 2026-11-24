/**
 * @file util.ts
 * @description Declares lightweight utility functions including console logging wrappers, status area
 * message overlays, and current local time generator.
 */

'use strict';

let DEBUG = typeof window !== 'undefined' && window.location
    ? parseInt((new URLSearchParams(window.location.search)).get("debug") ?? "0", 10) !== 0
    : false;

function getStatusElement(): JQuery<HTMLElement> | null {
    if (typeof $ === 'undefined') {
        return null;
    }
    return $("#status");
}

/**
 * Log on console if DEBUG is true.
 */
function debug(...args: any[]): void {
    if (!DEBUG) return;
    console.log(...args);
}

/**
 * Show a message in the status area and fade it out after a short delay.
 */
function info(...args: any[]): void {
    infoRaw(...args);
    getStatusElement()?.delay(3000).fadeOut(1000);
}

/**
 * Show a message in the status area immediately without scheduling a fade-out.
 */
function infoRaw(...args: any[]): void {
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
function getCurrentTime(nowUtc: Date = new Date()): string {
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    const ret = nowLocal.toISOString();
    return ret.replace("Z", "").replace(/[:T]/g, "-").replace(/\..*$/, "");
}

export function setDebug(enabled: boolean): void {
    DEBUG = enabled;
}

export function toggleDebug(): void {
    DEBUG = !DEBUG;
    info("Debug log is now " + (DEBUG ? "enabled" : "disabled"));
}

export { DEBUG, debug, info, infoRaw, getCurrentTime };
