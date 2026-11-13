import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cuadra · Tu obra, con quien sabe hacerla',
    short_name: 'Cuadra',
    description:
      'Compara cotizaciones claras de especialistas y sabe exactamente qué pagas, sin gastos sorpresa.',
    lang: 'es-PE',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#16181d',
    theme_color: '#16181d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
