import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";
import "./workroom.css";

const sans = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const arabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], display: "swap", weight: "variable" });

const mono = IBM_Plex_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADHAM | Engineering projects",
  description: "Plan, build, and verify software projects in a durable engineering workspace.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Visitors enter directly; browser identities are issued automatically.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, arabic.variable, mono.variable)} dir="ltr" lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
