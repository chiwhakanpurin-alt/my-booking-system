const sharp = require('sharp');
const fs = require('fs');

async function processLogo(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    
    // RGB check for non-white and non-transparent
    // The logo might have compression artifacts, so we treat anything > 245 as white
    const isWhite = (r, g, b) => r > 245 && g > 245 && b > 245;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * info.channels;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = info.channels > 3 ? data[offset + 3] : 255;
        
        // If it's NOT white and NOT transparent
        if (!isWhite(r, g, b) && a > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log(`Original bounding box for non-white pixels:`);
    console.log(`minX: ${minX}, maxX: ${maxX}`);
    console.log(`minY: ${minY}, maxY: ${maxY}`);
    const width = maxX - minX;
    const height = maxY - minY;
    console.log(`Actual Logo Width: ${width}, Height: ${height}`);
    
    // Extract just the actual logo part
    const extracted = await sharp(inputPath)
      .extract({ left: minX, top: minY, width: width, height: height })
      .toBuffer();

    const maxDim = Math.max(width, height);
    
    // Create square, transparent padded version
    await sharp(extracted)
      .resize({
        width: maxDim,
        height: maxDim,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFormat('png')
      .toFile(outputPath);
      
    console.log(`Saved fixed image to ${outputPath}`);
    
  } catch (error) {
    console.error(`Error:`, error);
  }
}

async function main() {
  await processLogo('./public/logo.jpg', './public/logo.jpg.tmp');
  await processLogo('./app/icon.jpg', './app/icon.jpg.tmp');
  fs.renameSync('./public/logo.jpg.tmp', './public/logo.jpg');
  fs.renameSync('./app/icon.jpg.tmp', './app/icon.jpg');
}

main();
