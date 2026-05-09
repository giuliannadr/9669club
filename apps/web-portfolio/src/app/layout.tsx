import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Studio AV | Cinematography & Production",
  description: "A gourmet audiovisual agency dedicated to telling stories that resonate deeply.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#050505] antialiased`}>
        {children}
      </body>
    </html>
  );
}
