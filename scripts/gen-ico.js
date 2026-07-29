const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 24, 32, 48, 64, 128, 256];
const src = path.join(__dirname, '..', 'resources', 'icon.png');
const out = path.join(__dirname, '..', 'resources', 'icon.ico');

async function createIco() {
  const entries = [];
  for (const size of sizes) {
    const buf = await sharp(src).resize(size, size).png().toBuffer();
    entries.push({ size, data: buf });
  }

  const count = entries.length;
  const headerSize = 6;
  const dirSize = 16 * count;
  let dataOffset = headerSize + dirSize;

  let totalSize = dataOffset;
  for (const e of entries) totalSize += e.data.length;

  const buf = Buffer.alloc(totalSize);

  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);

  for (let i = 0; i < count; i++) {
    const e = entries[i];
    const dirOff = headerSize + (i * 16);
    buf.writeUInt8(e.size >= 256 ? 0 : e.size, dirOff);
    buf.writeUInt8(e.size >= 256 ? 0 : e.size, dirOff + 1);
    buf.writeUInt8(0, dirOff + 2);
    buf.writeUInt8(0, dirOff + 3);
    buf.writeUInt16LE(1, dirOff + 4);
    buf.writeUInt16LE(32, dirOff + 6);
    buf.writeUInt32LE(e.data.length, dirOff + 8);
    buf.writeUInt32LE(dataOffset, dirOff + 12);
    e.data.copy(buf, dataOffset);
    dataOffset += e.data.length;
  }

  fs.writeFileSync(out, buf);
  console.log(`Created ${out}: ${buf.length} bytes, ${count} sizes`);
}

createIco().catch(err => { console.error(err); process.exit(1); });
