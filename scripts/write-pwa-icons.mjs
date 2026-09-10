import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const take = crc & 1;
      crc = take ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4);
  const crcInput = Buffer.concat([header.subarray(4), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([header, data, crc]);
}

function png(size, colorAt) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = colorAt(x, y, size);
      const i = y * stride + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function iconColor(x, y, size) {
  const terracotta = [196, 92, 38];
  const cream = [252, 246, 236];
  const cx = (x + 0.5) / size;
  const cy = (y + 0.5) / size;
  const roof = cy > 0.18 && cy < 0.42 && Math.abs(cx - 0.5) < 0.42 - (cy - 0.18);
  const body = cx > 0.22 && cx < 0.78 && cy > 0.38 && cy < 0.82;
  const door = cx > 0.42 && cx < 0.58 && cy > 0.58 && cy < 0.82;
  const windowL = cx > 0.3 && cx < 0.4 && cy > 0.46 && cy < 0.56;
  const windowR = cx > 0.6 && cx < 0.7 && cy > 0.46 && cy < 0.56;
  if (door || windowL || windowR) return terracotta;
  if (roof || body) return cream;
  return terracotta;
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size, iconColor));
}
writeFileSync(new URL("../public/apple-touch-icon.png", import.meta.url), png(180, iconColor));
writeFileSync(new URL("../public/badge.png", import.meta.url), png(96, iconColor));
console.log("wrote pwa icons");
