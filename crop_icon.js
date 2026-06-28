const sharp = require('sharp');

async function cropCenter() {
  try {
    const inputPath = './public/school-logo.png';
    
    // We want to extract a 280x280 square from the center of the 468x468 image
    // Center X = 234
    // Center Y = 234
    // Top = 234 - 140 = 94
    // Left = 234 - 140 = 94
    
    await sharp(inputPath)
      .extract({ left: 94, top: 94, width: 280, height: 280 })
      .png()
      .toFile('./app/icon.png');
      
    console.log("Cropped app/icon.png successfully!");
  } catch (error) {
    console.error(error);
  }
}

cropCenter();
