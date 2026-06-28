const sharp = require('sharp');
const fs = require('fs');

async function processLogo() {
  try {
    const inputPath = './public/logo.jpg';
    
    // We know it's a 331x468 PNG. We want to make it a perfect square without stretching.
    // The largest dimension is 468.
    const size = 468;
    
    await sharp(inputPath)
      .resize({
        width: size,
        height: size,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
      })
      .png()
      .toFile('./public/logo.png');
      
    // Create favicon (app/icon.png)
    await sharp(inputPath)
      .resize({
        width: size,
        height: size,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .png()
      .toFile('./app/icon.png');
      
    console.log("Created square logo.png and icon.png!");
  } catch (error) {
    console.error(error);
  }
}

processLogo();
