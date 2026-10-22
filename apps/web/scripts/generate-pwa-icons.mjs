// Genera los iconos de la app instalable a partir del logo de HarmonyHub: el icono "music-2" (lucide, licencia ISC)
// sobre el cuadrado redondeado del color principal, igual que en la barra lateral. Sin dependencias: dibuja con
// geometria simple y escribe PNG con zlib de Node.
//   node apps/web/scripts/generate-pwa-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const PRIMARY = [0x18, 0xe0, 0xae]; // --primary por defecto
const ON_PRIMARY = [0x04, 0x2f, 0x2a]; // --on-primary
const STROKE = 2.4; // mismo grosor que el logo de la barra lateral (en la grilla de 24 del icono)
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Glifo music-2 en la grilla 24x24: un circulo (la nota) y el palo con la bandera.
const CIRCLE = { x: 8, y: 18, r: 4 };
const SEGMENTS = [
  [12, 18, 12, 2],
  [12, 2, 19, 6],
];

function distanceToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function inGlyph(u, v) {
  if (Math.abs(Math.hypot(u - CIRCLE.x, v - CIRCLE.y) - CIRCLE.r) <= STROKE / 2) return true;
  return SEGMENTS.some((segment) => distanceToSegment(u, v, segment) <= STROKE / 2);
}

function inRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/**
 * @param size lado del PNG en pixeles
 * @param options.maskable fondo completo (Android recorta la forma) y glifo mas chico dentro de la zona segura
 */
function draw(size, { maskable = false } = {}) {
  const glyphSize = size * (maskable ? 0.42 : 0.5);
  const glyphOrigin = (size - glyphSize) / 2;
  const radius = size * (10 / 36); // mismo redondeo que el logo (10px en 36px)
  const samples = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let background = 0;
      let glyph = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          if (!maskable && !inRoundedSquare(px, py, size, radius)) continue;
          background++;
          if (inGlyph(((px - glyphOrigin) / glyphSize) * 24, ((py - glyphOrigin) / glyphSize) * 24)) glyph++;
        }
      }
      const total = samples * samples;
      const glyphShare = background ? glyph / background : 0;
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) pixels[offset + c] = Math.round(PRIMARY[c] * (1 - glyphShare) + ON_PRIMARY[c] * glyphShare);
      pixels[offset + 3] = Math.round((background / total) * 255);
    }
  }
  return encodePng(size, pixels);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': draw(192),
  'icon-512.png': draw(512),
  'icon-maskable-512.png': draw(512, { maskable: true }),
  'apple-touch-icon-180.png': draw(180, { maskable: true }), // iOS redondea solo las esquinas
};
for (const [name, png] of Object.entries(files)) writeFileSync(join(OUT, name), png);
writeFileSync(
  join(OUT, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="10" fill="#18e0ae"/><g transform="translate(9 9) scale(0.75)" fill="none" stroke="#042f2a" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="18" r="4"/><path d="M12 18V2l7 4"/></g></svg>\n`,
);
console.log(`iconos en ${OUT}: ${Object.keys(files).join(', ')}, favicon.svg`);
