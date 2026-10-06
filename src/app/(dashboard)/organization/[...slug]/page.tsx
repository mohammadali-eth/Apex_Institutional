'use client';

import { useParams } from 'next/navigation';
import { OrganizationBrowser } from '@/features/academic/OrganizationBrowser';

export default function OrganizationCatchAllPage() {
  const params = useParams();
  const slugArray = (params.slug as string[]) || [];

  const base = slugArray[0] as 'universities' | 'institutions' | 'departments' | 'programs' | 'subjects' | undefined;
  const id = slugArray[1];

  let kind: 'universities' | 'institutions' | 'institution' | 'departments' | 'department' | 'programs' | 'program' | 'subjects' | 'subject' = 'departments';

  if (base === 'universities') {
    kind = 'universities';
  } else if (base === 'institutions') {
    kind = id ? 'institution' : 'institutions';
  } else if (base === 'departments') {
    kind = id ? 'department' : 'departments';
  } else if (base === 'programs') {
    kind = id ? 'program' : 'programs';
  } else if (base === 'subjects') {
    kind = id ? 'subject' : 'subjects';
  }

  return <OrganizationBrowser kind={kind} id={id} />;
}
