import { cookies } from 'next/headers';
import { env } from '../constants/env';

export async function makeReq(path: string, options: RequestInit) {
  const cookiesList = await cookies();
  const accessToken = cookiesList.get('accessToken');
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${accessToken?.value}`);
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers,
  });
}
