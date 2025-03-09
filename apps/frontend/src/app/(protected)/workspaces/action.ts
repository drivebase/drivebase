'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setWorkspace(formData: FormData) {
  const cookieStore = await cookies();
  const workspaceId = formData.get('workspaceId') as string;
  cookieStore.set('workspaceId', workspaceId);
  redirect('/');
}
