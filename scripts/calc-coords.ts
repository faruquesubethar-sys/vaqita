// Compare 2D polygon with image silhouette
const imgW = 963;
const imgH = 909;

// In image pixels, centered:
// cx = 497, cy = 471
// Normalized from -1 to 1:
// Let's verify key points in example-tshirt-8fe09ecd.png:
// Top collar: y: 30, x: 381 to 613
// Shoulder: y: 150, x: 155 to 839
// Sleeve cuff peak: y: 270, x: 27 to 970
// Armpit: y: 420, x: 176 to 858
// Hem: y: 920, x: 144 to 840

console.log('Normalized coords (where center is 0,0, halfW ~ 1, halfH ~ 1):');
const norm = (x: number, y: number) => ({
  x: ((x - 497) / 481).toFixed(3),
  y: (-(y - 471) / 454).toFixed(3), // Three.js Y is up
});

console.log('Top collar center:', norm(497, 30));
console.log('Collar left:', norm(381, 40));
console.log('Shoulder left:', norm(236, 120));
console.log('Sleeve tip left:', norm(27, 270));
console.log('Sleeve cuff bottom left:', norm(116, 390));
console.log('Armpit left:', norm(176, 420));
console.log('Hem left:', norm(144, 915));
console.log('Hem right:', norm(840, 915));
console.log('Armpit right:', norm(817, 420));
console.log('Sleeve cuff bottom right:', norm(875, 390));
console.log('Sleeve tip right:', norm(970, 270));
console.log('Shoulder right:', norm(763, 120));
console.log('Collar right:', norm(613, 40));
