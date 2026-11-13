import {
  ArrowRight,
  BadgeCheck,
  Layers,
  MessageSquareText,
  PlayCircle,
  ReceiptText,
  Sparkles,
  Star,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const STEPS = [
  {
    title: 'Cuéntanos tu obra',
    text: 'Elige si quieres construir, ampliar, remodelar o reparar. Sube fotos o graba un audio, y di tu presupuesto y la fecha estimada.',
  },
  {
    title: 'Compara cotizaciones',
    text: 'Recibes propuestas con los mismos rubros: materiales, mano de obra, permisos, adicionales, plazo y calificación.',
  },
  {
    title: 'Revisa el detalle y elige',
    text: 'Mira el desglose y cuánto pagarías en cada etapa de la obra antes de decidir.',
  },
];

const RELIEVERS = [
  {
    icon: ReceiptText,
    title: 'Cotización desglosada',
    text: 'Sabes qué incluye cada precio y qué queda fuera.',
  },
  {
    icon: MessageSquareText,
    title: 'Lenguaje sencillo',
    text: 'Sin tecnicismos. Te explicamos cada rubro con palabras simples.',
  },
  {
    icon: BadgeCheck,
    title: 'Credenciales a la vista',
    text: 'Colegiatura, años de experiencia, obras y reseñas antes de contratar.',
  },
  {
    icon: WalletCards,
    title: 'Pagos por etapa',
    text: 'Pagas cada etapa cuando apruebas el avance real de la obra.',
  },
];

const OFFERS = [
  { name: 'Ing. Quispe', total: '58,400', rating: '4.8', note: null, best: true },
  { name: 'Arq. Salas', total: '63,900', rating: '4.7', note: null, best: false },
  { name: 'Mtro. Huamán', total: '51,000', rating: '4.5', note: 'Sin permisos', best: false },
];

function RoleLink({
  href,
  eyebrow,
  title,
  className,
}: {
  href: string;
  eyebrow: string;
  title: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-16 items-center justify-between rounded-2xl px-5 py-3 transition hover:brightness-105 ${className}`}
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold">{eyebrow}</span>
        <span className="text-lg font-extrabold">{title}</span>
      </span>
      <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

function ComparePreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm pt-4 pb-24">
      <div className="absolute bottom-0 -left-1 z-10 w-56 -rotate-3 rounded-3xl bg-plano p-4 text-white shadow-xl sm:-left-6">
        <span className="text-sm font-bold">Pagos por etapa</span>
        <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full">
          <span className="w-[34%] bg-obra" />
          <span className="w-[38%] bg-white" />
          <span className="w-[28%] bg-ink" />
        </div>
        <span className="mt-2 block text-xs text-plano-soft">Pagas cuando apruebas el avance</span>
      </div>
      <div className="relative rotate-2 rounded-3xl bg-white p-4 text-ink shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="font-extrabold">Ampliar 2.º piso</span>
          <span className="text-xs font-semibold text-muted">S/ 50–60 mil</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {OFFERS.map((offer) => (
            <div
              key={offer.name}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 ${offer.best ? 'border-visto bg-visto-soft' : 'border-line'}`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-extrabold">{offer.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Star className="size-3 fill-obra text-obra" />
                  {offer.rating}
                  {offer.note ? (
                    <span className="ml-1 rounded bg-obra-soft px-1.5 font-bold text-obra-text">
                      {offer.note}
                    </span>
                  ) : null}
                  {offer.best ? (
                    <span className="ml-1 rounded bg-visto px-1.5 font-bold text-white">
                      Mejor valor
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="font-extrabold">S/ {offer.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <main className="min-h-dvh bg-cemento">
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 pt-8 pb-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10 lg:pt-10 lg:pb-20">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <Logo inverted />
              <Link href="/login" className="text-[15px] font-bold text-mist hover:text-white">
                Iniciar sesión
              </Link>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <h1 className="text-[42px] leading-[1.02] font-extrabold tracking-tight [font-stretch:118%] lg:text-6xl">
                Tu obra, con <span className="text-obra">quien sabe hacerla.</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-mist">
                Compara cotizaciones claras de especialistas y sabe exactamente qué pagas, sin
                gastos sorpresa.
              </p>
            </div>
            <div className="flex max-w-lg flex-col gap-3">
              <RoleLink
                href="/registro?rol=family"
                eyebrow="Soy familia"
                title="Quiero construir o remodelar"
                className="bg-obra text-ink"
              />
              <RoleLink
                href="/registro?rol=specialist"
                eyebrow="Soy ingeniero, arquitecto o maestro de obra"
                title="Quiero cotizar obras"
                className="bg-plano text-white"
              />
              <Link
                href="/demo"
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-night-line font-bold transition hover:bg-white/5"
              >
                <PlayCircle className="size-5 text-obra" aria-hidden="true" />
                Pruébalo sin cuenta · 1 minuto
              </Link>
            </div>
          </div>
          <ComparePreview />
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 lg:px-10">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-extrabold tracking-widest text-obra-text uppercase">
            Cómo funciona
          </span>
          <h2 className="font-display text-3xl leading-tight lg:text-4xl">
            Tres pasos, sin letra chica
          </h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-3xl bg-white p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-lg font-extrabold text-white">
                {index + 1}
              </span>
              <h3 className="text-xl font-extrabold">{step.title}</h3>
              <p className="leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 lg:px-10">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-extrabold tracking-widest text-plano-text uppercase">
              Por qué Cuadra
            </span>
            <h2 className="font-display max-w-2xl text-3xl leading-tight lg:text-4xl">
              Que las cuentas de tu obra cuadren desde el inicio
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RELIEVERS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col gap-2.5 rounded-3xl bg-cemento p-5">
                <Icon className="size-7 text-obra" aria-hidden="true" />
                <h3 className="text-lg font-extrabold">{title}</h3>
                <p className="leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex gap-3 rounded-3xl bg-visto-soft p-5">
              <Sparkles className="size-6 shrink-0 text-visto" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong>Mejor valor, no solo el más barato.</strong> Te sugerimos la propuesta que
                más conviene según precio, costos definidos, reseñas y plazo. Y te decimos por qué.
              </p>
            </div>
            <div className="flex gap-3 rounded-3xl bg-plano-soft p-5">
              <Layers className="size-6 shrink-0 text-plano-text" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong>Para especialistas, cotizar no cuesta.</strong> Recibes obras de tu
                especialidad cerca de ti y subes de nivel con cada obra bien hecha.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p className="font-display max-w-2xl text-3xl leading-tight">
            Construye el hogar que sueñas con ingenieros de confianza y{' '}
            <span className="text-obra">precios claros.</span>
          </p>
          <Link
            href="/demo"
            className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-2xl bg-obra px-6 text-base font-extrabold text-ink transition hover:brightness-95"
          >
            Probar la demo
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-8 text-sm text-muted lg:px-10">
        <Logo />
        <p>Piloto en Lima. Los pagos dentro de la app todavía son simulados.</p>
      </footer>
    </main>
  );
}
