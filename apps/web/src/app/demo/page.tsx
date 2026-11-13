'use client';

import type { CreateProjectInput, QuoteView } from '@cc/contracts';
import { ArrowLeft, Check, Loader2, Timer } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CompareTable } from '@/components/compare-table';
import { Logo } from '@/components/logo';
import { ProjectForm } from '@/components/project-form';
import { QuoteBreakdown } from '@/components/quote-breakdown';
import { Sheet } from '@/components/sheet';
import { CredentialLine, SpecialistProfile } from '@/components/specialist-profile';
import {
  Avatar,
  Button,
  Card,
  LinkButton,
  PageTitle,
  Rating,
  StepIndicator,
} from '@/components/ui';
import { DEMO_REVIEWS, DEMO_SPECIALISTS, demoQuotes } from '@/lib/demo-data';
import { calendarDate, compactNumber, durationLabel, soles } from '@/lib/format';
import { previewFile } from '@/lib/upload';

type Step = 'describe' | 'sending' | 'compare' | 'detail' | 'decided';

const STEP_INDEX: Record<Step, number> = {
  describe: 0,
  sending: 1,
  compare: 1,
  detail: 2,
  decided: 3,
};

const SENDING_MS = 1600;
const SPECIALISTS = new Map(DEMO_SPECIALISTS.map((item) => [item.id, item]));

export default function DemoPage() {
  const [step, setStep] = useState<Step>('describe');
  const [project, setProject] = useState<CreateProjectInput | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [compareStartedAt, setCompareStartedAt] = useState(0);
  const [decisionMs, setDecisionMs] = useState(0);

  const quotes = useMemo(() => (project ? demoQuotes(project.title) : []), [project]);
  const quote = quotes.find((item) => item.id === quoteId);
  const specialist = quote ? SPECIALISTS.get(quote.specialistId) : undefined;
  const profile = profileId ? SPECIALISTS.get(profileId) : undefined;

  const goTo = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const describe = async (input: CreateProjectInput) => {
    setProject(input);
    goTo('sending');
    await new Promise((resolve) => setTimeout(resolve, SENDING_MS));
    setCompareStartedAt(Date.now());
    goTo('compare');
  };

  const openDetail = (selected: QuoteView) => {
    setQuoteId(selected.id);
    goTo('detail');
  };

  const choose = () => {
    setDecisionMs(Date.now() - compareStartedAt);
    goTo('decided');
  };

  const restart = () => {
    setProject(null);
    setQuoteId(null);
    goTo('describe');
  };

  return (
    <div className="min-h-dvh bg-cemento">
      <header className="sticky top-0 z-20 border-b border-line bg-cemento/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Inicio">
            <Logo />
          </Link>
          <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
            Demo sin cuenta
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-5 pb-16">
        {step !== 'decided' ? <StepIndicator current={STEP_INDEX[step]} /> : null}

        {step === 'describe' ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
            <PageTitle
              title="Cuéntanos tu obra"
              subtitle="Sin términos técnicos. Con fotos o un audio basta."
            />
            <p className="rounded-xl bg-plano-soft px-3.5 py-2.5 text-sm text-plano-text">
              Es una prueba: tus fotos y audios no salen de tu celular y no se guarda nada.
            </p>
            <ProjectForm
              onSubmit={describe}
              upload={previewFile}
              allowHighlight={false}
              submitLabel="Pedir cotizaciones"
            />
          </div>
        ) : null}

        {step === 'sending' ? (
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-3xl bg-ink px-6 py-16 text-center text-white"
          >
            <Loader2 className="size-8 animate-spin text-obra" aria-hidden="true" />
            <p className="font-display text-2xl">Enviando tu obra a especialistas cerca</p>
            <div className="flex -space-x-2">
              {DEMO_SPECIALISTS.map((item) => (
                <Avatar key={item.id} name={item.displayName} />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'compare' && project ? (
          <>
            <PageTitle
              title="Compara cotizaciones"
              subtitle="Tres especialistas te enviaron su propuesta. Mismos rubros, sin letra chica."
            />
            <p className="rounded-xl bg-obra-soft px-3.5 py-2.5 text-sm">
              {project.title} · tu presupuesto:{' '}
              <strong>
                {soles(project.budgetMinCents)} – {compactNumber(project.budgetMaxCents)}
              </strong>
              {project.estimatedDate ? ` · inicio ${calendarDate(project.estimatedDate)}` : ''}
            </p>
            <CompareTable
              quotes={quotes}
              specialists={SPECIALISTS}
              budgetMaxCents={project.budgetMaxCents}
              actions={(selected, selectedSpecialist) => (
                <div className="flex flex-col gap-2.5">
                  <Button onClick={() => openDetail(selected)}>
                    Ver desglose de {selectedSpecialist?.displayName ?? 'esta oferta'}
                  </Button>
                  <Button variant="outline" onClick={() => setProfileId(selected.specialistId)}>
                    Ver perfil y reseñas
                  </Button>
                </div>
              )}
            />
          </>
        ) : null}

        {step === 'detail' && quote && specialist && project ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Volver a comparar"
                onClick={() => goTo('compare')}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setProfileId(specialist.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left hover:bg-white/70"
              >
                <Avatar name={specialist.displayName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{specialist.displayName}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <Rating value={specialist.rating} count={specialist.reviewCount} />
                    <span className="font-bold text-plano-text underline">Ver perfil</span>
                  </span>
                </span>
              </button>
            </div>
            <CredentialLine specialist={specialist} />
            <QuoteBreakdown quote={quote} budgetMaxCents={project.budgetMaxCents} />
            <Button onClick={choose}>
              <Check className="size-5" aria-hidden="true" />
              Elegir a {specialist.displayName}
            </Button>
            <Button variant="outline" onClick={() => goTo('compare')}>
              Volver a comparar
            </Button>
          </div>
        ) : null}

        {step === 'decided' && quote && specialist ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <section className="flex flex-col items-center gap-3 rounded-3xl bg-ink px-6 py-8 text-center text-white">
              <span className="flex size-14 items-center justify-center rounded-full bg-obra text-ink">
                <Check className="size-8" strokeWidth={3} aria-hidden="true" />
              </span>
              <h1 className="font-display text-3xl leading-tight">
                Elegiste a {specialist.displayName}
              </h1>
              <p className="text-mist">
                {soles(quote.current.totalCents)} en {quote.current.durationWeeks} semanas.
              </p>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-night px-3 py-1.5 text-sm font-bold">
                <Timer className="size-4 text-obra" aria-hidden="true" />
                Decidiste en {durationLabel(decisionMs)}
              </p>
            </section>
            <Card className="flex flex-col gap-2">
              <h2 className="text-[15px] font-bold">Pagarías por etapas</h2>
              {quote.current.stages.map((stage, index) => (
                <div key={stage.id} className="flex justify-between gap-3 text-[15px]">
                  <span>
                    {index + 1}. {stage.name}
                  </span>
                  <strong className="whitespace-nowrap">{soles(stage.amountCents)}</strong>
                </div>
              ))}
            </Card>
            <p className="text-center text-sm text-muted">
              Es una demo: no contratamos a nadie ni se movió dinero.
            </p>
            <LinkButton href="/registro?rol=family">Crear mi cuenta gratis</LinkButton>
            <Button variant="outline" onClick={restart}>
              Probar otra vez
            </Button>
          </div>
        ) : null}
      </main>

      <Sheet
        open={profile !== undefined}
        title="Perfil del especialista"
        onClose={() => setProfileId(null)}
      >
        {profile ? (
          <SpecialistProfile specialist={profile} reviews={DEMO_REVIEWS[profile.id]} />
        ) : null}
      </Sheet>
    </div>
  );
}
