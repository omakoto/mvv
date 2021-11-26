'use strict';

const DEBUG = parseInt((new URLSearchParams(window.location.search)).get("debug") ?? "0") ? true : false;

if (!DEBUG) {
    console.log("Debug log is disabled. Use ?debug=1 to enable debug log.");
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
