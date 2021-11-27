'use strict';
const DEBUG = parseInt((new URLSearchParams(window.location.search)).get("debug") ?? "0") ? true : false;
if (!DEBUG) {
    console.log("Debug log is disabled. Use ?debug=1 to enable debug log.");
}
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
