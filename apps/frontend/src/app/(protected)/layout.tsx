import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileProvider from '@xilehq/frontend/components/layouts/profile.provider';

async function getUserByAccessToken(accessToken: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    redirect('/auth/login');
  }

  return response.json();
}

async function Layout({ children }: { children: React.ReactNode }) {
  const cookiesList = await cookies();
  const accessToken = cookiesList.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/auth/login');
  }

  const user = await getUserByAccessToken(accessToken);

  return <ProfileProvider profile={user.data}>{children}</ProfileProvider>;
}

export default Layout;
