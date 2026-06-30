import { ImageResponse } from 'next/og';
import { iconArt } from '@/lib/icon-art';

// Apple-Touch-Icon für „Zum Home-Bildschirm" unter iOS.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(iconArt(size.width), size);
}
