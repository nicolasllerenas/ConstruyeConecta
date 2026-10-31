'use client';

import { IMAGE_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '@cc/contracts';
import { Camera, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadFile } from '@/lib/upload';
import { ErrorNote } from './ui';

export function ImagePicker({
  urls,
  onChange,
  max = 6,
  tileClass = 'size-20',
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  tileClass?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    setError(null);
    const selected = [...files].slice(0, max - urls.length);
    if (selected.some((file) => file.size > MAX_UPLOAD_BYTES)) {
      setError('Cada foto debe pesar menos de 8 MB');
      return;
    }
    setBusy(true);
    try {
      const uploaded = await Promise.all(selected.map((file) => uploadFile(file, file.name)));
      onChange([...urls, ...uploaded]);
    } catch {
      setError('No pudimos subir la foto. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
      if (input.current) {
        input.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className={`relative overflow-hidden rounded-xl ${tileClass}`}>
            <img src={url} alt="Foto subida" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Quitar foto"
              onClick={() => onChange(urls.filter((item) => item !== url))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {urls.length < max ? (
          <button
            type="button"
            aria-label="Agregar foto"
            disabled={busy}
            onClick={() => input.current?.click()}
            className={`flex items-center justify-center rounded-xl border-2 border-dashed border-muted/60 text-ink hover:border-ink ${tileClass}`}
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-6" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={IMAGE_CONTENT_TYPES.join(',')}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <ErrorNote message={error} />
    </div>
  );
}
