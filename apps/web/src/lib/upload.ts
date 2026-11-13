import { upload } from '@vercel/blob/client';

export type Uploader = (file: File | Blob, name: string) => Promise<string>;

export async function previewFile(file: File | Blob): Promise<string> {
  return URL.createObjectURL(file);
}

export async function uploadFile(file: File | Blob, name: string): Promise<string> {
  const blob = await upload(name, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads',
  });
  return blob.url;
}
