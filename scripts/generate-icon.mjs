#!/usr/bin/env node
/**
 * Generates the Oathmark app icon as a PNG — no native dependencies,
 * just a minimal PNG encoder on top of node:zlib.
 *
 * Usage:
 *   node scripts/generate-icon.mjs                 # writes src/app/icon.png (512px)
 *   node scripts/generate-icon.mjs --size=256      # custom square size
 *   node scripts/generate-icon.mjs --out=public/icon.png
 *
 * The mark mirrors the brand: a paper field, a hairline frame in deep ink,
 * and a mint seal at the center.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/* ------------------------------ PNG encoder ----------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, pixelAt) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y, size);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/* ------------------------------- the mark ------------------------------- */

const PAPER = [243, 245, 240];
const INK = [7, 17, 14];
const MINT = [53, 213, 180];

function markPixel(x, y, size) {
  const m = size / 512; // geometry scale
  const frameOuter = 0.0; // frame spans the full canvas edge ring
  const frameInset = Math.round(40 * m); // ink frame thickness
  const innerGap = Math.round(56 * m); // paper channel between frame and seal
  const sealMargin = Math.round(176 * m); // mint seal inset

  const inFrame =
    x >= frameOuter && x < size - frameOuter && (y < frameInset || y >= size - frameInset)
      ? true
      : x < frameInset || x >= size - frameInset
        ? y >= frameOuter
        : false;
  if (inFrame) return [...INK, 255];

  if (x >= sealMargin && x < size - sealMargin && y >= sealMargin && y < size - sealMargin) {
    // inner hairline: a thin ink keyline just outside the mint seal
    return [...MINT, 255];
  }
  if (
    x >= sealMargin - Math.round(8 * m) &&
    x < size - sealMargin + Math.round(8 * m) &&
    y >= sealMargin - Math.round(8 * m) &&
    y < size - sealMargin + Math.round(8 * m)
  ) {
    return [...INK, 255];
  }
  void innerGap;
  return [...PAPER, 255];
}

/* --------------------------------- main --------------------------------- */

function parseArgs() {
  const args = { size: 512, out: "src/app/icon.png" };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--size=")) args.size = Number.parseInt(arg.slice("--size=".length), 10);
    if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
  }
  if (!Number.isInteger(args.size) || args.size < 16 || args.size > 4096) {
    console.error("Invalid --size; choose an integer between 16 and 4096.");
    process.exit(1);
  }
  return args;
}

const { size, out } = parseArgs();
const png = encodePng(size, markPixel);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`icon written: ${out} (${size}x${size}, ${png.length} bytes)`);
