import { Redirect, useLocalSearchParams } from 'expo-router';
import { DashboardView } from '@/features/admin/DashboardView';

/** One booth's numbers (from the booth table or the map). */
export default function AdminBooth() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const n = Number(no);
  if (!Number.isInteger(n) || n < 1) return <Redirect href="/admin/dashboard" />;
  return <DashboardView key={no} booth={n} />;
}
