import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Manrope({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADHAM AGENT | Workspace",
  description: "Your workspace for research, software delivery, and collaboration with AI agents.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Visitors enter directly; browser identities are issued automatically.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable)} dir="ltr" lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
