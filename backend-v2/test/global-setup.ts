/** Builds fresh test databases (t_elvote_*) with the sample data before the suite runs. */
export default async function setup() {
  process.env.DB_PREFIX = 't_';
  process.env.NODE_ENV = 'test';
  const { migrate } = await import('../scripts/migrate.js');
  const { seed } = await import('../scripts/seed.js');
  await migrate({ reset: true });
  await seed();
  const { processDirty } = await import('../src/lib/stats.js');
  const { closeAll } = await import('../src/db/pools.js');
  while (await processDirty(500));
  await closeAll();
}
