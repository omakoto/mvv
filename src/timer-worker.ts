console.log("Worker loaded");

onmessage = (e) => {
    console.log("Worker.onmessage", e);
    const data = e.data;
    if (data.action === "setInterval") {
        console.log("Setting timer with interval: " + data.interval + " ms, result:", data.result);

        let next = performance.now();
        const tick = () => {
            const now = performance.now();
            next += data.interval;
            if (next <= now) {
                // CPU couldn't keep up, or the device suspended.
                console.log("Adjusting the timer, did PC get suspended?");
                next = now + data.interval;
            }

            postMessage(data.result);
            setTimeout(tick, next - now);
        };
        tick();
    }
};
