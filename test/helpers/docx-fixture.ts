import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

/**
 * Build a genuinely zipped minimal OOXML package: [Content_Types].xml, _rels/.rels and
 * word/document.xml with a Title, a Heading1, a Heading2 and body paragraphs. The ZIP layout
 * (local headers, central directory, EOCD) is written by hand here; the reader under test
 * inflates the real deflateRawSync bytes, so nothing is asserted against a self-produced string.
 */
export function zipEntry(name: string, data: Buffer): { local: Buffer; central: Buffer } {
  const deflated = deflateRawSync(data);
  const nameBytes = Buffer.from(name, 'utf8');
  const crc = crc32(data);
  const local = Buffer.alloc(30 + nameBytes.length + deflated.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(8, 8); // method: deflate
  local.writeUInt16LE(0, 10); // time
  local.writeUInt16LE(0x21, 12); // date (1980-01-01, any valid date)
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(deflated.length, 18); // compressed size
  local.writeUInt32LE(data.length, 22); // uncompressed size
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28); // extra length
  nameBytes.copy(local, 30);
  deflated.copy(local, 30 + nameBytes.length);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10); // method
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(deflated.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42); // local header offset
  nameBytes.copy(central, 46);
  return { local, central };
}

let crcTable: number[] | null = null;
function crc32(data: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildDocx(bodyParagraphs: string): Buffer {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyParagraphs}<w:sectPr/></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const entries = [
    zipEntry('[Content_Types].xml', Buffer.from(contentTypes, 'utf8')),
    zipEntry('_rels/.rels', Buffer.from(rels, 'utf8')),
    zipEntry('word/document.xml', Buffer.from(documentXml, 'utf8')),
  ];
  // Each central-directory record must point at its own local header, so offsets accumulate.
  let offset = 0;
  for (const entry of entries) {
    entry.central.writeUInt32LE(offset, 42);
    offset += entry.local.length;
  }
  const locals = Buffer.concat(entries.map((e) => e.local));
  const centralStart = locals.length;
  const centrals = Buffer.concat(entries.map((e) => e.central));
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centrals.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  return Buffer.concat([locals, centrals, eocd]);
}

export function wordParagraph(style: string | null, text: string): string {
  const run = `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
  return style ? `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${run}</w:p>` : `<w:p>${run}</w:p>`;
}
