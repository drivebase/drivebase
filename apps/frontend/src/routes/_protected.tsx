import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/_protected')({
  component: () => <Outlet />,
  async beforeLoad({ context }) {
    if (context.auth.isServerAvailable) {
      if (!context.auth.isServerAvailable) {
        return redirect({ to: '/auth/login' });
      }
    } else {
      let count = 0;

      const MAX_RETRIES = 3;

      let spinner = toast.loading('Checking server...');

      function checkServer() {
        fetch(`${import.meta.env.VITE_PUBLIC_API_URL}/public/ping`)
          .then(() => {
            toast.success('Connected to server');
            toast.dismiss(spinner);
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          })
          .catch(() => {
            count++;
            toast.dismiss(spinner);
            if (count <= MAX_RETRIES) {
              spinner = toast.loading(`Retrying ${count} of ${MAX_RETRIES}...`);
              setTimeout(checkServer, 3000);
            } else {
              toast.error('Server is not responding');
              toast.dismiss(spinner);
            }
          });
      }

      setTimeout(checkServer, 3000);
    }
  },
});
