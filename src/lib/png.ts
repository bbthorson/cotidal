/**
 * A PNG of one colour at varying opacity, as a data URL, written by hand so
 * the server can draw the terrain's shading without a canvas (workerd has
 * none). Each byte is one pixel's opacity, 0 (clear) to 255 (solid); the map
 * uses it as an alpha mask, so solid is "paint here" and clear is "leave the
 * paper". Alpha, not luminance: a luminance mask is read through the
 * display's gamma, which dims every half-tone.
 *
 * The image data is stored uncompressed (deflate's stored blocks): a 41 × 41
 * mask is a few KB either way, and compressing it would mean shipping zlib
 * or waiting on `CompressionStream`, which is asynchronous.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function chunk(type: string, data: Uint8Array): number[] {
  const body = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
  body.set(data, 4);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

/** A zlib stream of stored (uncompressed) deflate blocks. */
function zlibStored(raw: Uint8Array): Uint8Array {
  const out: number[] = [0x78, 0x01];
  const MAX = 65535;
  for (let i = 0; i < raw.length || i === 0; i += MAX) {
    const block = raw.subarray(i, i + MAX);
    const last = i + MAX >= raw.length ? 1 : 0;
    out.push(last, block.length & 0xff, block.length >>> 8, ~block.length & 0xff, (~block.length >>> 8) & 0xff, ...block);
    if (raw.length === 0) break;
  }
  out.push(...u32(adler32(raw)));
  return Uint8Array.from(out);
}

function base64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** `pixels[j * width + i]` is the pixel in column i of row j, rows top to bottom. */
export function alphaPng(width: number, height: number, pixels: Uint8Array): string {
  if (pixels.length !== width * height) throw new Error('alphaPng: pixel count does not match the size');
  // Grey and alpha (colour type 4), white throughout; each row starts with its filter type (0, none).
  const row = 1 + 2 * width;
  const raw = new Uint8Array(height * row);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      raw[j * row + 1 + 2 * i] = 255;
      raw[j * row + 2 + 2 * i] = pixels[j * width + i];
    }
  }
  const header = Uint8Array.from([...u32(width), ...u32(height), 8, 4, 0, 0, 0]);
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', header),
    ...chunk('IDAT', zlibStored(raw)),
    ...chunk('IEND', new Uint8Array(0)),
  ]);
  return `data:image/png;base64,${base64(png)}`;
}
