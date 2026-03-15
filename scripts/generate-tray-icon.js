/**
 * Generates assets/tray.png (32x32) and assets/icon.png (256x256): orange-on-black "M" for MoneyMan.
 * Run: npm run generate-tray-icon
 */
const path = require('path');
const fs = require('fs');

function drawM(buffer, size, stroke) {
  const orange = { r: 255, g: 140, b: 0 };
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 0;
    buffer[i + 1] = 0;
    buffer[i + 2] = 0;
    buffer[i + 3] = 255;
  }
  function setPixel(x, y) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    buffer[i] = orange.r;
    buffer[i + 1] = orange.g;
    buffer[i + 2] = orange.b;
    buffer[i + 3] = 255;
  }
  function fillRect(x0, y0, x1, y1) {
    for (let y = Math.max(0, y0); y < Math.min(size, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(size, x1); x++)
        setPixel(x, y);
  }
  const pad = Math.round(size * 0.12);
  const w = size - 2 * pad;
  const h = size - 2 * pad;
  for (let row = 0; row < h; row++) {
    const t = row / (h - 1);
    const leftX = pad + t * (w * 0.2);
    const rightX = size - pad - t * (w * 0.2);
    const midLeft = pad + w * 0.5 - Math.abs(t - 0.5) * w * 0.4;
    const midRight = pad + w * 0.5 + Math.abs(t - 0.5) * w * 0.4;
    fillRect(Math.floor(leftX - stroke), pad + row, Math.ceil(leftX + stroke) + 1, pad + row + 1);
    fillRect(Math.floor(rightX - stroke), pad + row, Math.ceil(rightX + stroke) + 1, pad + row + 1);
    if (t <= 0.5)
      fillRect(Math.floor(midLeft - stroke), pad + row, Math.ceil(midRight + stroke) + 1, pad + row + 1);
  }
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run npm install first (sharp is a devDependency).');
    process.exit(1);
  }

  const assetsDir = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Tray: 32x32, thin stroke
  const size32 = 32;
  const buf32 = Buffer.alloc(size32 * size32 * 4);
  drawM(buf32, size32, 1);
  await sharp(buf32, { raw: { width: size32, height: size32, channels: 4 } })
    .png()
    .toFile(path.join(assetsDir, 'tray.png'));
  console.log('Wrote assets/tray.png');

  // App/installer icon: 256x256, thicker stroke
  const size256 = 256;
  const buf256 = Buffer.alloc(size256 * size256 * 4);
  drawM(buf256, size256, 10);
  await sharp(buf256, { raw: { width: size256, height: size256, channels: 4 } })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('Wrote assets/icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
