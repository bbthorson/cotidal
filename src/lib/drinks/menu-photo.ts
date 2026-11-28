import type { CaptureMenuResponse } from '../api-client';
import { drinkDatabase } from './data';
import { addMenuLines, type MenuItem } from './menu-rank';
import type { Register } from './register';
import type { QuadrantId } from '../map/coordinates';

/** The longest side a menu photo is sent at: enough to read, small enough to upload fast. */
const MAX_SIDE = 1600;

/** Shrink a menu photo to at most `MAX_SIDE` and re-encode it as JPEG base64, in the browser; null if it can't be read. */
export async function compressMenuPhoto(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    return base64 ? { base64, mimeType: 'image/jpeg' } : null;
  } catch {
    return null;
  }
}

/**
 * Add a photographed menu's lines to the menu so far (`addMenuLines`), then
 * give each line nothing placed a direction where the capture found one
 * (`/api/menu/capture`), with its closest classic. A line already placed, or
 * already given a direction, is left as it is.
 */
export function mergeCapturedItems(prev: MenuItem[], res: CaptureMenuResponse, register: Register): MenuItem[] {
  const base = addMenuLines(prev, res.lines.join('\n'), register);
  const byLabel = new Map(res.items.map((i) => [i.label.toLowerCase(), i]));
  return base.map((item) => {
    if (item.drink || item.directional) return item;
    const directional = byLabel.get(item.label.toLowerCase())?.directional;
    if (!directional) return item;
    const closest = directional.closestClassicName
      ? (drinkDatabase.find((d) => d.name === directional.closestClassicName) ?? null)
      : null;
    return {
      ...item,
      directional: {
        x: directional.x,
        y: directional.y,
        quadrant: directional.quadrant as QuadrantId,
        confidence: directional.confidence,
        primitives: [],
        aversions: directional.aversions,
        closestClassic: closest,
      },
      ...(closest ? { relative: closest } : {}),
    };
  });
}
