const sharp = require('sharp');
const fs = require('fs');

async function extractAndMakeTransparent(inputPath, outputPath) {
  try {
    console.log(`Processing ${inputPath}...`);
    
    // 1. Crop the image around the crest
    const croppedBuffer = await sharp(inputPath)
      .extract({ left: 75, top: 146, width: 650, height: 650 })
      .toBuffer();
      
    // 2. Make white pixels transparent
    const image = sharp(croppedBuffer);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Create new buffer for RGBA (4 channels)
    const outData = Buffer.alloc(info.width * info.height * 4);
    
    for (let i = 0; i < info.width * info.height; i++) {
      const inOffset = i * info.channels;
      const outOffset = i * 4;
      
      const r = data[inOffset];
      const g = data[inOffset + 1];
      const b = data[inOffset + 2];
      
      outData[outOffset] = r;
      outData[outOffset + 1] = g;
      outData[outOffset + 2] = b;
      
      // If it's white or very light gray, make it transparent
      if (r > 230 && g > 230 && b > 230) {
        // Also check if it's relatively grayscale to avoid removing bright yellow/cyan (though 230 is very bright)
        if (Math.abs(r-g) < 15 && Math.abs(g-b) < 15) {
          outData[outOffset + 3] = 0; // Fully transparent
        } else {
          outData[outOffset + 3] = 255; // Opaque
        }
      } else {
        outData[outOffset + 3] = 255; // Opaque
      }
    }
    
    // 3. Save as PNG
    await sharp(outData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    
    console.log(`Saved transparent logo to ${outputPath}`);
    
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
  }
}

async function main() {
  await extractAndMakeTransparent('./public/logo.jpg', './public/logo-trans.png');
  await extractAndMakeTransparent('./app/icon.jpg', './app/icon-trans.png');
}

main();
