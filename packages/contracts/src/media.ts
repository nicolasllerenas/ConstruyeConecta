import { z } from 'zod';

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

export const mediaUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  }, 'La URL del archivo no es válida');

export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AUDIO_CONTENT_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
