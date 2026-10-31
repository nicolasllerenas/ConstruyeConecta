'use client';

import clsx from 'clsx';
import { Loader2, Mic, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { uploadFile } from '@/lib/upload';
import { ErrorNote } from './ui';

const MAX_SECONDS = 120;

export function VoiceRecorder({
  url,
  onChange,
}: {
  url: string | undefined;
  onChange: (url: string | undefined) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
      recorder.current?.stream.getTracks().forEach((track) => {
        track.stop();
      });
    },
    [],
  );

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
    }
    recorder.current?.stop();
    setRecording(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => chunks.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        const type = media.mimeType.split(';')[0] ?? 'audio/webm';
        const extension = type.includes('mp4') ? 'mp4' : 'webm';
        setUploading(true);
        try {
          onChange(await uploadFile(new Blob(chunks, { type }), `nota-de-voz.${extension}`));
        } catch {
          setError('No pudimos subir tu audio. Inténtalo de nuevo.');
        } finally {
          setUploading(false);
        }
      };
      recorder.current = media;
      media.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        setSeconds((current) => {
          if (current + 1 >= MAX_SECONDS) {
            stop();
          }
          return current + 1;
        });
      }, 1000);
    } catch {
      setError('Necesitamos permiso para usar tu micrófono.');
    }
  };

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white p-2.5">
        <button
          type="button"
          aria-label={recording ? 'Detener grabación' : 'Grabar nota de voz'}
          disabled={uploading}
          onClick={recording ? stop : start}
          className={clsx(
            'flex size-11 shrink-0 items-center justify-center rounded-full text-ink',
            recording ? 'animate-pulse bg-obra-soft' : 'bg-obra',
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : recording ? (
            <Square className="size-5 fill-ink" aria-hidden="true" />
          ) : (
            <Mic className="size-5" aria-hidden="true" />
          )}
        </button>
        {url && !recording ? (
          <>
            <audio src={url} controls className="h-10 min-w-0 flex-1">
              <track kind="captions" />
            </audio>
            <button
              type="button"
              aria-label="Borrar nota de voz"
              onClick={() => onChange(undefined)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <span className="text-sm text-muted">
            {recording ? `Grabando ${clock}` : 'Cuéntanos con tu voz qué quieres hacer'}
          </span>
        )}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
