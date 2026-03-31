const processor = require('./sync.processor');

setInterval(async () => {
  try {
    await processor.process();
  } catch (err) {
    console.error('[PROCESSOR LOOP ERROR]', err);
  }
}, 5000);
