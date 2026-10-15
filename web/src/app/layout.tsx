import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/legal/Legal";
import { Header } from "@/components/Header";
import { MetaLoader } from "@/components/MetaLoader";
import { LeaveGuard } from "@/components/LeaveGuard";

export const metadata: Metadata = {
  title: "Nikasha — The touchstone for your trading strategy",
  description: "Test a Nifty 50 options strategy on past market data and see why it worked or failed.",
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen font-sans" style={{ ["--font-inter" as string]: "'Inter Variable'" }}>
        <MetaLoader />
        <LeaveGuard />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
