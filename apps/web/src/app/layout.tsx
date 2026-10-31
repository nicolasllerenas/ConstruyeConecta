import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ConstruyeConecta',
  description:
    'Compara cotizaciones desglosadas de especialistas y evita gastos sorpresa en tu obra.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16181d',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  return (
    <html lang="es" className={archivo.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
