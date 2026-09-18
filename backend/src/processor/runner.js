const processor = require('./sync.processor');

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await processor.process();
  } catch (err) {
    console.error('[PROCESSOR LOOP ERROR]', err);
  } finally {
    running = false;
  }
}

function start(intervalMs = Number(process.env.SYNC_PROCESSOR_INTERVAL_MS || 5000)) {
  if (timer) return timer;
  timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = start;
module.exports.start = start;
module.exports.stop = stop;
module.exports.tick = tick;
