'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui';
import { useViewer } from '../viewer';

export default function HomeRedirectPage() {
  const router = useRouter();
  const { user } = useViewer();
  useEffect(() => {
    router.replace(user.role === 'family' ? '/explorar' : '/solicitudes');
  }, [router, user.role]);
  return <Loading />;
}
