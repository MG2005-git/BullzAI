// Generates crisp geometric BullzAI icons (16, 32, 48, 128) using pure Node.js (zlib).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, toCrc, crc]);
}

function createPng(size, drawPixel) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflateSync(rawData));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Renders a high-tech charging Bull icon with glowing emerald horns and cyan accents
function renderBullPixel(x, y, size) {
  const nx = (x / (size - 1)) * 2 - 1; // -1 to 1
  const ny = (y / (size - 1)) * 2 - 1; // -1 to 1

  // Outer rounded rect container (cyber obsidian #0b0e14)
  const cornerR = 0.85;
  const d = Math.max(Math.abs(nx), Math.abs(ny));
  if (d > 0.96) return [0, 0, 0, 0]; // rounded transparent edges

  // Background radial gradient: dark obsidian with subtle center emerald glow
  const rDist = Math.sqrt(nx * nx + ny * ny);
  let bgR = 11, bgG = 14, bgB = 20, bgA = 255;
  if (rDist < 0.9) {
    const glow = Math.max(0, 1 - rDist);
    bgR = Math.min(255, Math.round(11 + glow * 10));
    bgG = Math.min(255, Math.round(14 + glow * 35));
    bgB = Math.min(255, Math.round(20 + glow * 25));
  }

  // Border glow
  if (d > 0.88 && d <= 0.95) {
    return [0, 230, 118, Math.round(200 * (1 - (d - 0.88) / 0.07))];
  }

  // Bull Head Geometry:
  // Symmetrical around nx = 0
  const ax = Math.abs(nx);

  // Left & Right Horns (glowing emerald to cyan upward curve)
  // Horn curve: y from -0.6 to -0.05, ax from 0.15 to 0.7
  const hornX = 0.2 + 0.5 * Math.pow((ny + 0.6) / 0.6, 2);
  const hornDist = Math.abs(ax - hornX);
  if (ny >= -0.7 && ny <= 0.05 && hornDist < 0.12 * (1 - (ny + 0.7) * 0.4)) {
    // Horn gradient: emerald at tip, neon green at base
    const t = (ny + 0.7) / 0.75;
    return [Math.round(t * 0), Math.round(255 - t * 25), Math.round(200 - t * 100), 255];
  }

  // Bull Forehead & Face (shield shape)
  // ax <= 0.42 at top (ny = -0.05), tapering to ax <= 0.22 at muzzle (ny = 0.55)
  if (ny >= -0.08 && ny <= 0.6) {
    const faceW = 0.45 - (ny + 0.08) * 0.32;
    if (ax <= faceW) {
      // Shading: center crest has electric cyan highlight
      if (ax < 0.06 && ny < 0.35) {
        return [0, 240, 255, 255]; // center neon spine
      }
      // Eyes: sharp angled slits at ny ~ 0.15, ax ~ 0.22
      if (ny >= 0.10 && ny <= 0.18 && ax >= 0.16 && ax <= 0.30) {
        return [0, 255, 136, 255]; // glowing emerald eyes
      }
      // Bull face plate
      return [20, 28, 42, 255];
    }
  }

  // Bull Muzzle / Snout (ny between 0.45 and 0.65, ax <= 0.22)
  if (ny > 0.45 && ny <= 0.68 && ax <= 0.22) {
    // Nostrils
    if (ny >= 0.52 && ny <= 0.60 && ax >= 0.06 && ax <= 0.13) {
      return [0, 230, 118, 255];
    }
    return [16, 22, 34, 255];
  }

  // Subtle BullzAI "B" symbol accent on forehead
  if (ny >= 0.0 && ny <= 0.25 && ax < 0.10) {
    return [0, 230, 118, 255];
  }

  return [bgR, bgG, bgB, bgA];
}

for (const size of [16, 32, 48, 128]) {
  const png = createPng(size, renderBullPixel);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
}

