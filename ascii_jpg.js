const sharp = require('sharp');

async function printAscii() {
  try {
    const { data, info } = await sharp('./public/logo.jpg')
      .resize(30, 30, { fit: 'inside' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let ascii = '';
    const chars = ' .:-=+*#%@';
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const val = data[y * info.width + x];
        const charIdx = Math.floor((val / 255) * (chars.length - 1));
        ascii += chars[charIdx] + ' ';
      }
      ascii += '\n';
    }
    console.log(ascii);
  } catch (error) {
    console.error(error);
  }
}

printAscii();
