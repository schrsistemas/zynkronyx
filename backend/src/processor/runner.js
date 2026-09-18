const processor = require('./sync.processor');

let timer = null;

function start(intervalMs = Number(process.env.SYNC_INTERVAL_MS || 5000)) {
  if (timer) return timer;

  timer = setInterval(async () => {
    try {
      await processor.process();
    } catch (err) {
      console.error('[PROCESSOR LOOP ERROR]', err);
    }
  }, intervalMs);

  return timer;
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };
