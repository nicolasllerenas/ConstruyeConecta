import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

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

function Illustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-72 w-full max-w-sm">
      <div className="absolute top-8 left-0 flex h-52 w-56 -rotate-9 flex-col justify-end gap-1 rounded-3xl bg-plano p-4 text-white">
        <span className="font-bold">Arquitecta</span>
        <span className="text-sm">8 semanas</span>
      </div>
      <div className="absolute top-4 right-2 flex h-60 w-56 rotate-5 flex-col gap-2.5 rounded-3xl bg-white p-4 text-ink shadow-2xl">
        <div className="blueprint h-24 rounded-xl" />
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-obra text-xs font-extrabold">
            IQ
          </span>
          <span className="flex flex-col">
            <span className="font-bold">Especialista</span>
            <span className="text-[13px] text-muted">Ingeniería · cerca de ti</span>
          </span>
        </div>
        <span className="flex items-center gap-1 text-sm text-muted">
          <Star className="size-4 fill-obra text-obra" />
          Reseñas de obras reales
        </span>
      </div>
      <div className="absolute top-14 right-10 -rotate-12 rounded-xl border-[3px] border-obra bg-ink px-2.5 py-1 text-xl font-extrabold text-obra [font-stretch:125%]">
        MATCH
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <main className="min-h-dvh bg-ink text-white">
      <div className="mx-auto grid min-h-dvh max-w-6xl gap-6 px-6 py-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10">
        <div className="flex flex-col gap-6">
          <Logo inverted />
          <div className="lg:hidden">
            <Illustration />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-[40px] leading-[1.02] font-extrabold tracking-tight [font-stretch:118%] lg:text-6xl">
              Tu obra, con <span className="text-obra">quien sabe hacerla.</span>
            </h1>
            <p className="max-w-lg leading-relaxed text-mist lg:text-lg">
              Compara cotizaciones claras de especialistas y sabe exactamente qué pagas, sin gastos
              sorpresa.
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
              title="Ofrezco mis servicios"
              className="bg-plano text-white"
            />
            <p className="pt-1.5 text-center text-[15px] text-mist">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-bold text-obra hover:text-white">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
        <div className="hidden lg:block">
          <Illustration />
        </div>
      </div>
    </main>
  );
}
