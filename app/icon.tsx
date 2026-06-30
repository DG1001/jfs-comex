import { ImageResponse } from 'next/og';
import { iconArt } from '@/lib/icon-art';

// App-Icon (auch Favicon) — als PNG per next/og erzeugt.
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(iconArt(size.width), size);
}
