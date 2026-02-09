import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

const sizes = [192, 512];
const svgPath = './public/icons/icon.svg';

async function generatePngs() {
  // Read SVG file
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // Create a temporary HTML with the SVG embedded
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Load and draw the SVG
    const img = await loadImage(svgDataUrl);
    ctx.drawImage(img, 0, 0, size, size);

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    const outputPath = `./public/icons/icon-${size}.png`;
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated ${outputPath}`);
  }
}

generatePngs().catch(console.error);
