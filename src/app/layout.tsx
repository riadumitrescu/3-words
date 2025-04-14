import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3 Words - Personality Game',
  description: 'See how others perceive you with just 3 words',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
