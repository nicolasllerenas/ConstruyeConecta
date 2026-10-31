'use client';

import { X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { LogoMark } from './logo';
import { LinkButton } from './ui';

export function MatchScreen({
  counterpart,
  projectTitle,
  steps,
  primaryHref,
  primaryLabel,
  onClose,
}: {
  counterpart: string;
  projectTitle: string;
  steps: string[];
  primaryHref: string;
  primaryLabel: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Es match"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink text-white"
    >
      <div className="flex min-h-full w-full max-w-md flex-col gap-6 px-6 pt-6 pb-8">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="flex size-11 items-center justify-center self-end rounded-xl bg-night"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.h2
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="text-6xl leading-none font-extrabold tracking-tight text-obra [font-stretch:125%]"
          >
            ¡Es match!
          </motion.h2>
          <p className="max-w-xs text-mist">
            A <strong className="text-white">{counterpart}</strong> también le interesa{' '}
            <strong className="text-white">{projectTitle}</strong>.
          </p>
        </div>
        <div className="flex justify-center py-4">
          <div className="flex size-24 items-center justify-center rounded-full bg-white">
            <LogoMark size={64} />
          </div>
        </div>
        <div className="flex flex-col gap-3.5 rounded-3xl bg-night p-5">
          <h3 className="text-sm font-bold tracking-widest text-mist uppercase">Lo que sigue</h3>
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-obra font-extrabold text-ink">
                {index + 1}
              </span>
              <span className="text-[15px] leading-snug">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2.5">
          <LinkButton href={primaryHref}>{primaryLabel}</LinkButton>
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 rounded-2xl border-2 border-night-line font-bold"
          >
            Seguir explorando
          </button>
          <Link href="/perfil" className="sr-only">
            Ir a mi perfil
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
