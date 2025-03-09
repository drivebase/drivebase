import '@drivebase/ui/globals.css';
import { Ubuntu } from 'next/font/google';
import Providers from './providers';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export const metadata = {
  title: 'Drivebase - Unified Cloud Storage',
  description:
    'Open-source, self-hosted cloud file manager designed to unify file storage across multiple cloud providers into one seamless interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ubuntu.className} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
