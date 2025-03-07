import '@xilehq/ui/globals.css';
import { Inter } from 'next/font/google';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Xile File Manager',
  description:
    'Open-source, self-hosted cloud file manager designed to unify file storage across multiple cloud providers into one seamless interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
