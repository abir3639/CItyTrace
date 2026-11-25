import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CityTrace — The Truth Behind Every Street",
  description:
    "Civic transparency platform visualizing urban infrastructure history, public expenditure in BDT, and evidence-bound accountability analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="font-sans bg-[#F5F5F7] text-[#1D1D1F] antialiased selection:bg-[#007AFF]/15 selection:text-[#0055CC]">
        {children}
      </body>
    </html>
  );
}
