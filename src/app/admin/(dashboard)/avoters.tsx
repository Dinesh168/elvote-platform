import { VoterListScreen } from '@/features/easy/VoterListScreen';

/** Voters of one booth with a filter (spec easy-redesign A1). */
export default function AdminVoters() {
  return <VoterListScreen pushed admin housePath="/admin/ahouse" />;
}
