import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3 Words - Know Yourself, Through Others",
  description: "A personality-based game that helps you understand how others perceive you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
