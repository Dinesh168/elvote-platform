import { VoterListScreen } from '@/features/easy/VoterListScreen';

/** A shortcut opened from Home (spec easy-redesign V2): Back returns to Home as it was. */
export default function HomeList() {
  return <VoterListScreen pushed housePath="/h-house" />;
}
