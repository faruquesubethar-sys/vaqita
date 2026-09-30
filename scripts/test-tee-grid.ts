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
  [-0.24, 0.92],
  [-0.60, 0.76],
  [-0.96, 0.42],
  [-0.78, 0.16],
  [-0.64, 0.18],
  [-0.58, -1.02],
  [0.58, -1.02],
  [0.64, 0.18],
  [0.78, 0.16],
  [0.96, 0.42],
  [0.60, 0.76],
  [0.24, 0.92],
  [0.00, 0.82],
];

const teeSdf = (x: number, y: number) => polygonSdf(x, y, TEE_POINTS) - 0.03;

// Test grid sampling
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
