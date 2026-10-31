import { upload } from '@vercel/blob/client';

export async function uploadFile(file: File | Blob, name: string): Promise<string> {
  const blob = await upload(name, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads',
  });
  return blob.url;
}
