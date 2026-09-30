import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('public/uploads/example-tshirt-8fe09ecd.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

// Collect all IDAT chunks
const idatChunks: Buffer[] = [];
let offset = 8;
while (offset < buf.length) {
  const length = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IDAT') {
    idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
  }
  offset += 12 + length;
}

const idat = Buffer.concat(idatChunks);
const raw = zlib.inflateSync(idat);

// Check if pixel is foreground (t-shirt) vs black background (luminance > 30)
// Assuming RGBA (4 bytes per pixel) or RGB (3 bytes per pixel)
const bytesPerPixel = Math.round((raw.length / height - 1));
console.log('Bytes per pixel / scanline info:', bytesPerPixel, 'raw length:', raw.length);

const stride = 1 + width * 4; // if RGBA
// Let's find minX, maxX, minY, maxY of t-shirt
let minX = width, maxX = 0, minY = height, maxY = 0;
const rowBounds: { y: number; minX: number; maxX: number }[] = [];

for (let y = 0; y < height; y++) {
  const rowStart = y * (1 + width * 4) + 1; // skip filter byte
  let rMin = width, rMax = 0;
  for (let x = 0; x < width; x++) {
    const idx = rowStart + x * 4;
    const r = raw[idx];
    const g = raw[idx + 1];
    const b = raw[idx + 2];
    const a = raw[idx + 3];
    // Background in image is pure black rgb(0,0,0)
    if (r > 30 || g > 30 || b > 30) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < rMin) rMin = x;
      if (x > rMax) rMax = x;
    }
  }
  if (rMin <= rMax && y % 30 === 0) {
    rowBounds.push({ y, minX: rMin, maxX: rMax });
  }
}

console.log('T-shirt bbox:', { minX, maxX, width: maxX - minX, minY, maxY, height: maxY - minY });
console.log('Selected row widths across Y (top to bottom):');
for (const rb of rowBounds) {
  console.log(`y: ${rb.y} | left: ${rb.minX} | right: ${rb.maxX} | width: ${rb.maxX - rb.minX}`);
}
