/**
 * Gera os icones do PWA sem depender de biblioteca de imagem.
 * Marca: anel (o ciclo de 365 dias) com um ponto de progresso em ambar.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "icons");

const BRAND = [31, 130, 116];
const RING = [255, 255, 255];
const DOT = [245, 158, 11];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filtro "none"
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixelAt(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Mistura duas cores; usado para suavizar as bordas (antialiasing simples). */
function mix(a, b, t) {
  const k = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function makeIcon(size, contentScale) {
  const center = size / 2;
  const outer = size * contentScale * 0.5;
  const inner = outer * 0.66;
  const edge = Math.max(1, size / 96);

  const dotAngle = -Math.PI / 2;
  const dotRadius = (outer + inner) / 2;
  const dotX = center + Math.cos(dotAngle) * dotRadius;
  const dotY = center + Math.sin(dotAngle) * dotRadius;
  const dotSize = (outer - inner) * 0.78;

  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    const distToDot = Math.hypot(px - dotX, py - dotY);
    if (distToDot <= dotSize / 2 + edge) {
      return mix(DOT, BRAND, (distToDot - (dotSize / 2 - edge)) / (2 * edge));
    }

    const dist = Math.hypot(px - center, py - center);
    if (dist >= inner - edge && dist <= outer + edge) {
      const fadeIn = (dist - (inner - edge)) / (2 * edge);
      const fadeOut = (dist - (outer - edge)) / (2 * edge);
      const alpha = Math.min(fadeIn, 1 - fadeOut);
      return mix(BRAND, RING, alpha);
    }

    return BRAND;
  };
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, scale: 0.78 },
  { file: "icon-512.png", size: 512, scale: 0.78 },
  // Maskable precisa caber na zona segura de 80% (Android recorta as bordas).
  { file: "icon-maskable-512.png", size: 512, scale: 0.56 },
];

for (const { file, size, scale } of targets) {
  writeFileSync(join(OUT_DIR, file), encodePng(size, makeIcon(size, scale)));
  console.log(`gerado public/icons/${file} (${size}x${size})`);
}

writeFileSync(join(ROOT, "public", "apple-touch-icon.png"), encodePng(180, makeIcon(180, 0.72)));
console.log("gerado public/apple-touch-icon.png (180x180)");

writeFileSync(join(ROOT, "src", "app", "icon.png"), encodePng(64, makeIcon(64, 0.8)));
console.log("gerado src/app/icon.png (64x64)");
