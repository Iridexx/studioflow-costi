import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioFlow Costi",
  description: "Costi di sviluppo di StudioFlow, uso interno dei soci",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
