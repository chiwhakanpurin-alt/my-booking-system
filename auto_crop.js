const sharp = require('sharp');

async function autoCrop() {
  try {
    const inputPath = './public/school-logo.png';
    
    // Read raw pixels
    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * info.channels;
        
        // Since it's a transparent png, we can just check if alpha > 10
        // Wait, info.channels might be 3 if it has no alpha? school-logo.png was saved with {r:0,g:0,b:0,alpha:0} so it should be 4.
        const a = info.channels === 4 ? data[offset + 3] : 255;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        
        // Sometimes white background remains if it wasn't perfectly transparent, so let's also check if it's NOT white
        const isNotWhite = (r < 240 || g < 240 || b < 240);
        
        if (a > 10 && isNotWhite) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    // Add a small padding (2 pixels) to avoid cutting the edge
    minX = Math.max(0, minX - 2);
    maxX = Math.min(info.width - 1, maxX + 2);
    minY = Math.max(0, minY - 2);
    maxY = Math.min(info.height - 1, maxY + 2);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    console.log(`Crest bounding box: left=${minX}, top=${minY}, width=${cropWidth}, height=${cropHeight}`);
    
    // Now extract just the crest
    const croppedBuffer = await sharp(inputPath)
      .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
      .toBuffer();
      
    // Make it a perfect square
    const size = Math.max(cropWidth, cropHeight);
    
    // Since it's a crest, we can also make the outside transparent.
    // Let's create a square canvas with transparent background and composite the cropped image in the center.
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: croppedBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toFile('./public/school-logo-cropped.png');
    
    console.log(`Saved perfectly cropped square logo to school-logo-cropped.png (size: ${size}x${size})`);
    
  } catch (error) {
    console.error(error);
  }
}

autoCrop();
