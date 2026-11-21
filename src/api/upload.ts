/**
 * Attach a picked file to a multipart form (spec usability-r2 B1). Web: the browser File (or the picked blob URL).
 * Phones use upload.native.ts.
 */
export type PickedFile = { uri: string; name: string; type?: string; file?: Blob | null };

export async function appendFile(form: FormData, field: string, f: PickedFile): Promise<void> {
  const blob = f.file ?? (await (await fetch(f.uri)).blob());
  form.append(field, blob, f.name);
}
