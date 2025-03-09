import React from 'react';
import AppLayout from '@xilehq/frontend/components/layouts/app.layout';

function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

export default Layout;
