'use strict';

const DEBUG = parseInt((new URLSearchParams(window.location.search)).get("debug")) ? true : false;

if (!DEBUG) {
    console.log("Debug log is disabled. Use ?debug=1 to enable debug log.");
}

function debug(...args) {
    if (!DEBUG) return;
    console.log(...args);
}

const elStatus = $("#status");

function info(...args) {
    infoRaw(args);
    elStatus.delay(3000).fadeOut(1000);
}

function infoRaw(...args) {
    let message = args.join(" ");

    elStatus.stop(true, true);
    elStatus.show();
    elStatus.text(message);
}

function w(value, callback) {
    callback(value);
}
