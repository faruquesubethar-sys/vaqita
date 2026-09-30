import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('public/uploads/example-tshirt-8fe09ecd.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

const idatChunks: Buffer[] = [];
let offset = 8;
while (offset < buf.length) {
  const length = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IDAT') idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
  offset += 12 + length;
}

const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const at = (x: number, y: number) => {
  const i = y * (1 + width * 4) + 1 + x * 4;
  return [raw[i], raw[i+1], raw[i+2], raw[i+3]];
};

const isGarment = (x: number, y: number) => {
  const p = at(x, y);
  return (p[0] > 30 || p[1] > 30 || p[2] > 30) && p[3] > 20;
};

// Find bbox
let minX = width, maxX = 0, minY = height, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isGarment(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const halfW = (maxX - minX) / 2;
const halfH = (maxY - minY) / 2;

console.log('Image bbox:', { minX, maxX, minY, maxY, cx, cy, halfW, halfH });

// Scale to -1..1 coordinates
const toCoord = (x: number, y: number) => [
  Number(((x - cx) / halfW).toFixed(3)),
  Number((- (y - cy) / halfH).toFixed(3))
];

// Let's sample key outline points
// 1. Collar top left and right
let collarLeftX = cx, collarRightX = cx;
for (let x = minX; x <= maxX; x++) {
  if (isGarment(x, minY + 15)) {
    if (collarLeftX === cx) collarLeftX = x;
    collarRightX = x;
  }
}

// 2. Collar center dip
let collarDipY = minY;
while (collarDipY < maxY && !isGarment(Math.round(cx), collarDipY)) {
  collarDipY++;
}

console.log('Collar dip Y:', collarDipY);
console.log('Collar left:', toCoord(collarLeftX, minY + 15));
console.log('Collar right:', toCoord(collarRightX, minY + 15));
console.log('Collar dip center:', toCoord(cx, collarDipY));

// Sleeve tips: leftmost and rightmost points
let leftTip = [minX, 0], rightTip = [maxX, 0];
for (let y = minY; y <= maxY; y++) {
  if (isGarment(minX, y)) leftTip = [minX, y];
  if (isGarment(maxX, y)) rightTip = [maxX, y];
}
console.log('Sleeve left tip:', toCoord(leftTip[0], leftTip[1]));
console.log('Sleeve right tip:', toCoord(rightTip[0], rightTip[1]));

// Hem left and right (at maxY - 10)
let hemLeftX = cx, hemRightX = cx;
for (let x = minX; x <= maxX; x++) {
  if (isGarment(x, maxY - 10)) {
    if (hemLeftX === cx) hemLeftX = x;
    hemRightX = x;
  }
}
console.log('Hem left:', toCoord(hemLeftX, maxY - 10));
console.log('Hem right:', toCoord(hemRightX, maxY - 10));
