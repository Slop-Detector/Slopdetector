// Resize icons/slopmoji.png into icon16/48/128.png
const sharp = require('sharp');
const path = require('path');

const sizes = [16, 48, 128];
const inputFile = path.join(__dirname, 'slopmoji.png');

async function generateIcons() {
  console.log('Generating icons from slopmoji.png...');
  
  for (const size of sizes) {
    const outputFile = path.join(__dirname, `icon${size}.png`);
    
    await sharp(inputFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputFile);
    
    console.log(`✓ Generated ${outputFile}`);
  }
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
