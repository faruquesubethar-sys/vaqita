import fs from 'fs';

const buf = fs.readFileSync('public/uploads/example-tshirt-8fe09ecd.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log('Image dimensions:', width, 'x', height);
