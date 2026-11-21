/** TC-R2-1 (docs/test-cases/usability-r2.md): phones attach a real file, not a { uri } object. */
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) { this.uri = uri; }
    bytes() { return Promise.resolve(new Uint8Array([1, 2, 3])); }
  },
}));
// eslint-disable-next-line import/first
import { File } from 'expo-file-system';
// eslint-disable-next-line import/first
import { appendFile } from './upload.native';

it('TC-R2-1 native appendFile adds an expo-file-system File with the file name', async () => {
  const parts: unknown[][] = [];
  const form = { append: (...a: unknown[]) => parts.push(a) } as unknown as FormData;
  await appendFile(form, 'file', { uri: 'file:///cache/banner.jpg', name: 'banner.jpg', type: 'image/jpeg' });
  expect(parts).toHaveLength(1);
  const [field, value, name] = parts[0];
  expect(field).toBe('file');
  expect(value).toBeInstanceOf(File);
  expect((value as { uri: string }).uri).toBe('file:///cache/banner.jpg');
  expect(typeof (value as { bytes: unknown }).bytes).toBe('function');
  expect(name).toBe('banner.jpg');
});
