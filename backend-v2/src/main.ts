import { buildApp } from './app.js';
import { env } from './config.js';
import { closeAll } from './db/pools.js';
import { eraseDueAccounts } from './lib/account.js';
import { setNotifyLog } from './lib/notify.js';
import { runPresenceJobs } from './lib/presence.js';
import { processDirty } from './lib/stats.js';

const app = await buildApp();
setNotifyLog((e) => app.log.warn({ err: e.message }, 'notification failed'));
await app.listen({ port: env.PORT, host: env.HOST });

// Counter worker: recompute booths changed in the last few seconds.
let busy = false;
const timer = setInterval(async () => {
  if (busy) return;
  busy = true;
  try {
    await processDirty(200);
  } catch (e) {
    app.log.error({ err: (e as Error).message }, 'counter worker failed');
  } finally {
    busy = false;
  }
}, 3000);

// Account erasure worker (spec account-deletion AD4): every 10 minutes.
const eraser = setInterval(() => {
  eraseDueAccounts().then(
    (n) => n && app.log.info({ n }, 'accounts erased'),
    (e) => app.log.error({ err: (e as Error).message }, 'account erasure failed'),
  );
}, 10 * 60_000);

// Polling day (spec polling-day A1, O1): "still away" alerts and 30-day clean-up, every minute.
let presenceBusy = false;
const presence = setInterval(() => {
  if (presenceBusy) return;
  presenceBusy = true;
  runPresenceJobs((e) => app.log.warn({ err: e.message }, 'push failed'))
    .catch((e) => app.log.error({ err: (e as Error).message }, 'presence job failed'))
    .finally(() => { presenceBusy = false; });
}, 60_000);

const stop = async () => {
  clearInterval(timer);
  clearInterval(presence);
  clearInterval(eraser);
  await app.close();
  await closeAll();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
