import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuoteLink",
  description: "Your Claude writes the quote. QuoteLink hosts it, lets you edit it, and gets it accepted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${schibsted.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
