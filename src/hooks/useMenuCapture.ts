import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { captureMenu } from '@/lib/api-client';
import { compass } from '@/lib/copy';
import { compressMenuPhoto, mergeCapturedItems } from '@/lib/drinks/menu-photo';
import type { MenuItem } from '@/lib/drinks/menu-rank';
import type { Register } from '@/lib/drinks/register';

/**
 * Photographing a menu (members): the tap that opens the camera, the upload
 * (`/api/menu/capture`), and its outcome. A guest's tap asks them to sign in
 * instead; a read with no lines, or one over the allowance, says so.
 */
export function useMenuCapture(isMember: boolean, register: Register, setItems: Dispatch<SetStateAction<MenuItem[]>>) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [askSignIn, setAskSignIn] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const start = () => {
    setMessage(null);
    if (!isMember) {
      setAskSignIn(true);
      return;
    }
    fileInput.current?.click();
  };

  const onFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setScanning(true);
    setMessage(null);
    const photo = await compressMenuPhoto(file);
    const res = photo ? await captureMenu({ image: photo.base64, mimeType: photo.mimeType }) : null;
    setScanning(false);
    if (res?.requiresSignIn) setAskSignIn(true);
    else if (res?.outcome === 'rate-limited') setMessage(compass.atMenu.photoRateLimited);
    else if (!res || res.lines.length === 0) setMessage(compass.atMenu.photoEmpty);
    else setItems((prev) => mergeCapturedItems(prev, res, register));
  };

  return { scanning, message, askSignIn: askSignIn && !isMember, fileInput, start, onFile };
}

export type MenuCapture = ReturnType<typeof useMenuCapture>;
