'use client';

import type { CreateProjectInput, ProjectCard } from '@cc/contracts';
import { useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/project-form';
import { Loading, PageTitle, StepIndicator } from '@/components/ui';
import { request } from '@/lib/api';
import { useViewer } from '../../viewer';

export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile } = useViewer();

  if (user.role !== 'family') {
    router.replace('/solicitudes');
    return <Loading />;
  }

  const publish = async (input: CreateProjectInput) => {
    const project = await request<ProjectCard>('marketplace/projects', 'POST', input);
    router.push(`/explorar?obra=${project.id}`);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <StepIndicator current={0} />
      <PageTitle
        title="Cuéntanos tu obra"
        subtitle="Sin términos técnicos. Con fotos o un audio basta."
      />
      <ProjectForm
        onSubmit={publish}
        footer={
          <p className="text-sm text-muted">
            Obra en {profile.district}. Puedes cambiar tu ubicación en tu perfil.
          </p>
        }
      />
    </div>
  );
}
