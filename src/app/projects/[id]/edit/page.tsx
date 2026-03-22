'use client';

import { useParams, redirect } from 'next/navigation';

export default function EditRedirect() {
  const params = useParams();
  redirect(`/projects/${params.id}`);
}
