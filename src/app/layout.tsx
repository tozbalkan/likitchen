import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../styles/global.css';
import * as styles from './layout.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LI Kitchen & Bed — Sales Rep Dashboard',
  description: 'Active WhatsApp AI Qualified Leads & Human Takeover Controls',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${styles.rootHtml}`}
    >
      <body className={styles.rootBody}>{children}</body>
    </html>
  );
}
