"use strict";
console.log("Worker loaded");
onmessage = (e) => {
    console.log("Worker.onmessage", e);
    const data = e.data;
    if (data.action == "setInterval") {
        console.log("Setting timer with interval: " + data.interval + " ms, result:", data.result);
        let next = performance.now();
        const tick = () => {
            next += data.interval;
            postMessage(data.result);
            setTimeout(tick, next - performance.now());
        };
        tick();
    }
};
