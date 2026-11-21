import { useTranslation } from 'react-i18next';
import { useOutbox } from '@/stores/outbox';
import { useActiveMembership } from '@/stores/session';
import { DEFAULT_SYNC, nextSyncAt, useSyncState, type SyncConfig } from './engine';

export type Tone = 'ok' | 'busy' | 'wait' | 'warn';

/** S8: one line that tells the volunteer exactly where their changes are. */
export function useSyncStatus(): { label: string; tone: Tone; pending: number; problems: number; cfg: SyncConfig } {
  const { t } = useTranslation();
  const pending = useOutbox((s) => s.items.length);
  const problems = useOutbox((s) => s.problems.length);
  const draining = useOutbox((s) => s.draining);
  const lastSyncedAt = useOutbox((s) => s.lastSyncedAt);
  const online = useSyncState((s) => s.online);
  const lastTryAt = useSyncState((s) => s.lastTryAt);
  useSyncState((s) => s.lastTickAt); // re-render every tick for the countdown
  const m = useActiveMembership();
  const cfg: SyncConfig = m?.sync ? { mode: m.sync.mode, minutes: m.sync.minutes } : DEFAULT_SYNC;

  if (draining) return { label: t('sync.saving'), tone: 'busy', pending, problems, cfg };
  if (problems) return { label: t('sync.attention', { count: problems }), tone: 'warn', pending, problems, cfg };
  if (cfg.mode === 'offline') return { label: pending ? t('sync.offlineMode', { count: pending }) : t('sync.offlineModeEmpty'), tone: pending ? 'wait' : 'ok', pending, problems, cfg };
  if (pending && !online) return { label: t('sync.offline', { count: pending }), tone: 'wait', pending, problems, cfg };
  if (pending && cfg.mode === 'scheduled') {
    // eslint-disable-next-line react-hooks/purity -- countdown: re-rendered every sync tick, reads the clock on purpose
    const at = nextSyncAt(cfg, lastTryAt ?? lastSyncedAt) ?? Date.now();
    // eslint-disable-next-line react-hooks/purity -- countdown: re-rendered every sync tick, reads the clock on purpose
    const min = Math.max(0, Math.ceil((at - Date.now()) / 60_000));
    return { label: min > 0 ? t('sync.nextIn', { count: min, n: pending }) : t('sync.saving'), tone: 'wait', pending, problems, cfg };
  }
  if (pending) return { label: t('sync.waiting', { count: pending }), tone: 'wait', pending, problems, cfg };
  return { label: t('sync.synced'), tone: 'ok', pending, problems, cfg };
}
