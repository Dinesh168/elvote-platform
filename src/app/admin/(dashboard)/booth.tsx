import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old links (map, booth table): one booth opens its place page (spec easy-redesign A2). */
export default function AdminBooth() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const n = Number(no);
  if (!Number.isInteger(n) || n < 1) return <Redirect href="/admin/dashboard" />;
  return <Redirect href={{ pathname: '/admin/place', params: { view: 'zone', booth: String(n) } }} />;
}
