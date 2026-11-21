/**
 * Attach a picked file to a multipart form on Android/iOS (spec usability-r2 B1).
 *
 * Expo SDK 58 installs `expo/fetch` as the global fetch. It only sends parts that can give their bytes (Blob or an
 * expo-file-system File); React Native's old `{ uri, name, type }` parts make it throw before anything is sent, which
 * the app showed as "No connection to the server". So the picked file is passed as an expo-file-system File.
 */
import { File } from 'expo-file-system';

export type PickedFile = { uri: string; name: string; type?: string; file?: Blob | null };

export async function appendFile(form: FormData, field: string, f: PickedFile): Promise<void> {
  form.append(field, new File(f.uri) as unknown as Blob, f.name);
}
