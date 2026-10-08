import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";
import "./workroom.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: "variable", style: ["normal", "italic"] });

const mono = IBM_Plex_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADHAM | Workroom",
  description: "A considered workspace for software decisions, delivery briefs, and work with your agent.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Visitors enter directly; browser identities are issued automatically.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, display.variable, mono.variable)} dir="ltr" lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
