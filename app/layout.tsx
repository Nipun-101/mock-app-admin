import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdProvider } from '@/components/antd-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mock Test Admin',
  description: 'Admin console for questions, papers, catalog, and uploads',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
