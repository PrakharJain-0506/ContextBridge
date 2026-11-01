import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Raw image data with RGBA (4 bytes per pixel) + 1 filter byte per line
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside rounded square
      const inBox = Math.abs(dx) <= radius && Math.abs(dy) <= radius;
      // Arc bridge check
      const arcDist = Math.abs(Math.sqrt((x - size * 0.2) ** 2 + (y - size * 0.8) ** 2) - size * 0.55);

      if (dist <= radius) {
        // Cyan / Sky Blue brand theme
        if (arcDist <= size * 0.08 || (Math.abs(y - size * 0.72) <= size * 0.05 && x >= size * 0.2 && x <= size * 0.8)) {
          // Bridge line / highlight: #38bdf8
          rawBytes[offset++] = 0x38;
          rawBytes[offset++] = 0xbd;
          rawBytes[offset++] = 0xf8;
          rawBytes[offset++] = 0xff;
        } else {
          // Background slate-900: #0f172a
          rawBytes[offset++] = 0x0f;
          rawBytes[offset++] = 0x17;
          rawBytes[offset++] = 0x2a;
          rawBytes[offset++] = 0xff;
        }
      } else {
        // Transparent border
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
      }
    }
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawBytes));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const dir = path.resolve('extension/icons');
fs.mkdirSync(dir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pngBuffer = generatePng(size);
  const dest = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(dest, pngBuffer);
  console.log(`Generated ${dest} (${pngBuffer.length} bytes)`);
}
