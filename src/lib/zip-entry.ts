/**
 * A minimal reader for ONE entry of a ZIP archive, inflating with the browser's own
 * DecompressionStream('deflate-raw') so no dependency is needed. Only stored (method 0) and
 * deflated (method 8) entries are supported, which is all a .docx package uses.
 */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot unpack compressed Word files. Choose a PDF instead, or use a current Chrome, Firefox or Safari.');
  }
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read one named entry from a ZIP byte stream, or null when the archive has no such entry. */
export async function readZipEntry(zip: Uint8Array, name: string): Promise<Uint8Array | null> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // The end-of-central-directory record lives in the last 64 KiB + its own 22 bytes.
  let eocd = -1;
  const floor = Math.max(0, zip.length - 65_558);
  for (let i = zip.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('This file is not a readable archive.');
  const entries = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true);
    const csize = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const entryName = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;
    if (entryName !== name) continue;
    const localNameLen = view.getUint16(localAt + 26, true);
    const localExtraLen = view.getUint16(localAt + 28, true);
    const start = localAt + 30 + localNameLen + localExtraLen;
    const data = zip.subarray(start, start + csize);
    if (method === 0) return data.slice();
    if (method === 8) return inflateRaw(data);
    throw new Error(`This Word file uses a compression method (${method}) this browser cannot unpack.`);
  }
  return null;
}
