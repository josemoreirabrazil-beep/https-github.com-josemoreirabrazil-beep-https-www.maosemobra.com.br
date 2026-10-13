const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines: width * 4 + 1 filter byte per line
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Construction brand icon painter
function paintIcon(x, y, w, h, isMaskable = false) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1; // -1 to 1

  // Background
  const distCenter = Math.sqrt(nx * nx + ny * ny);

  // Background colors: dark slate #0f172a to #1e293b
  let r = 15 + Math.floor((ny + 1) * 8);
  let g = 23 + Math.floor((ny + 1) * 10);
  let b = 42 + Math.floor((ny + 1) * 12);
  let a = 255;

  if (!isMaskable) {
    // Rounded corner clamp for standard icons
    const cornerRadius = 0.35;
    const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
    const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0];
    }
  }

  // Draw helmet shape
  // Head dome
  const helmetCenterX = 0;
  const helmetCenterY = 0.05;
  const scale = isMaskable ? 0.42 : 0.48;

  const dx = (nx - helmetCenterX) / scale;
  const dy = (ny - helmetCenterY) / scale;

  // Helmet dome test
  const domeDist = Math.sqrt(dx * dx + (dy * 1.1) * (dy * 1.1));
  const inDome = domeDist < 0.65 && dy < 0.25;

  // Helmet brim test
  const inBrim = (dy >= 0.20 && dy <= 0.42 && Math.abs(dx) <= (0.85 - (dy - 0.20) * 0.5));

  // Center crest
  const inCrest = (Math.abs(dx) <= 0.12 && dy >= -0.75 && dy <= 0.25);

  if (inDome || inBrim || inCrest) {
    // Amber/Gold color #f59e0b / #fbbf24
    let goldFactor = 0.5 + 0.5 * (1 - dy);
    r = Math.min(255, Math.floor(245 * goldFactor + 30));
    g = Math.min(255, Math.floor(158 * goldFactor + 20));
    b = Math.floor(11 * goldFactor);

    if (inCrest) {
      r = 254;
      g = 215;
      b = 64;
    }

    // Emblem in center
    const embDist = Math.sqrt(dx * dx + (dy + 0.05) * (dy + 0.05));
    if (embDist < 0.16) {
      r = 15;
      g = 23;
      b = 42;
    } else if (embDist < 0.18) {
      r = 255;
      g = 255;
      b = 255;
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(__dirname, '../public');

// Generate icons
console.log('Generating PWA icons...');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => paintIcon(x, y, w, h, false)));
console.log('Created pwa-192x192.png');

fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => paintIcon(x, y, w, h, false)));
console.log('Created pwa-512x512.png');

fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => paintIcon(x, y, w, h, true)));
console.log('Created pwa-maskable-512x512.png');

fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => paintIcon(x, y, w, h, false)));
console.log('Created apple-touch-icon.png');

console.log('All icons generated successfully!');
