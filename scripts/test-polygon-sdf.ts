import * as THREE from 'three';

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const lenSq = bax * bax + bay * bay;
  const h = lenSq > 1e-8 ? Math.max(0, Math.min(1, (pax * bax + pay * bay) / lenSq)) : 0;
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

function polygonSdf(px: number, py: number, points: [number, number][]): number {
  let minD = Infinity;
  let inside = false;
  const n = points.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];

    const d = distToSegment(px, py, xi, yi, xj, yj);
    if (d < minD) minD = d;

    const intersect = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }

  return inside ? -minD : minD;
}

const TEE_POINTS: [number, number][] = [
  [-0.24, 0.96],  // collar left
  [-0.48, 0.86],  // shoulder slope mid left
  [-0.72, 0.70],  // shoulder to sleeve join left
  [-0.98, 0.44],  // sleeve tip left
  [-0.79, 0.18],  // sleeve cuff bottom left
  [-0.67, 0.12],  // armpit left
  [-0.68, -0.40], // waist left
  [-0.72, -0.97], // hem bottom left
  [0.72, -0.97],  // hem bottom right
  [0.68, -0.40],  // waist right
  [0.67, 0.12],   // armpit right
  [0.79, 0.18],   // sleeve cuff bottom right
  [0.98, 0.44],   // sleeve tip right
  [0.72, 0.70],   // shoulder to sleeve join right
  [0.48, 0.86],   // shoulder slope mid right
  [0.24, 0.96],   // collar right
  [0.00, 0.83],   // crew neck dip
];

const teeSdf = (x: number, y: number) => polygonSdf(x, y, TEE_POINTS) - 0.025;

const minX = -1.3, maxX = 1.3, minY = -1.35, maxY = 1.3;
const cols = 150;
const rows = Math.round((cols * (maxY - minY)) / (maxX - minX));
let countInside = 0;
let uMin = 1, uMax = 0, vMin = 1, vMax = 0;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = minX + ((maxX - minX) * c) / (cols - 1);
    const y = minY + ((maxY - minY) * r) / (rows - 1);
    const d = teeSdf(x, y);
    if (d <= 0) {
      countInside++;
      const u = (x - minX) / (maxX - minX);
      const v = (y - minY) / (maxY - minY);
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  }
}

console.log('Inside samples:', countInside);
console.log('UV bounds:', { uMin, uMax, width: uMax - uMin, vMin, vMax, height: vMax - vMin });
console.log('Aspect ratio (width / height):', (uMax - uMin) / (vMax - vMin));
console.log('Original image aspect ratio:', 963 / 909);
