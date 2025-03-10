import { makeReq } from '@drivebase/frontend/helpers/make.req';
import { redirect } from 'next/navigation';

async function getWorkspaces() {
  const response = await makeReq('/workspaces', {
    method: 'GET',
  });
  const data = await response.json();
  return data;
}

async function Page() {
  const response = await getWorkspaces();

  if (response.statusCode !== 200) {
    redirect('/auth/login');
  }

  if (response.data.length === 0) {
    redirect('/onboarding');
  }

  if (response.data.length > 0) {
    redirect(`/workspaces/${response.data[0].id}`);
  }
}

export default Page;
