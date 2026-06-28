const sharp = require('sharp');

async function fixLogoSize() {
  try {
    const inputPath = './public/school-logo.png';
    
    // First, let's just use sharp's fluid API
    await sharp(inputPath)
      .trim({ threshold: 240 }) // This removes transparent borders
      .toBuffer({ resolveWithObject: true })
      .then(async ({ data, info }) => {
        // Then we resize it into a square using max dimension
        const size = Math.max(info.width, info.height);
        
        await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
          .resize({
            width: size,
            height: size,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile('./public/school-logo.png');
          
        await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
          .resize({
            width: size,
            height: size,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile('./app/icon.png');
          
        console.log(`Saved tightly cropped school-logo.png and icon.png at size ${size}x${size}`);
      });
  } catch (error) {
    console.error(error);
  }
}

fixLogoSize();
